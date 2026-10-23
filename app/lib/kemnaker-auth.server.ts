import crypto from "crypto";
import { sendAttendanceErrorEmail } from "./email.server";

export interface MonevAuthResult {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  name?: string;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BROWSER_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-CH-UA":
    '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function notifyAuthError(errorMessage: string, emailTarget?: string) {
  const alertEmail = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!alertEmail) return;

  const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const dateStr = nowWib.toISOString().split("T")[0];

  try {
    await sendAttendanceErrorEmail({
      to: alertEmail,
      userName: emailTarget || "Admin Ngabsennn",
      dateStr,
      errorMessage,
    });
  } catch (e) {
    console.error("[KemnakerAuth] Gagal kirim email alert:", e);
  }
}

/**
 * Automates full SSO OAuth2 login against Kemnaker Identity Provider
 * and exchanges code to obtain fresh MagangHub Monev access_token AND 30-day refresh_token.
 */
export async function authenticateKemnakerMonev(credentials: {
  email: string;
  password: string;
}): Promise<MonevAuthResult> {
  const username = credentials.email.trim();
  const password = credentials.password.trim();

  if (!username || !password) {
    return {
      success: false,
      error: "Email dan password Kemnaker wajib diisi.",
    };
  }

  try {
    const state = crypto.randomBytes(32).toString("base64url");
    const authUrl = `https://account.kemnaker.go.id/auth?client_id=79230891-cc02-43c8-964c-b525bce27857&redirect_uri=https%3A%2F%2Fmonev.maganghub.kemnaker.go.id%2Fsso%2Fcallback&response_type=code&scope=basic%20email&state=${state}`;

    // Step 1: Initial GET to obtain session cookies and CSRF token dynamically
    const cookieMap: Record<string, string> = {};
    const saveCookies = (headers: Headers) => {
      headers.getSetCookie?.().forEach((c) => {
        const [kv] = c.split(";");
        const [k, v] = kv.split("=");
        if (k && v) cookieMap[k.trim()] = v.trim();
      });
    };

    const getCookieHeader = () =>
      Object.entries(cookieMap)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");

    // Follow redirect manually to preserve OAuth session cookies into /auth/login
    const res1 = await fetch(authUrl, {
      headers: BROWSER_HEADERS,
      redirect: "manual",
    });
    saveCookies(res1.headers);

    const loginPageUrl =
      res1.headers.get("location") || "https://account.kemnaker.go.id/auth/login";
    const resLoginPage = await fetch(loginPageUrl, {
      headers: {
        ...BROWSER_HEADERS,
        Cookie: getCookieHeader(),
      },
    });
    saveCookies(resLoginPage.headers);

    if (resLoginPage.status === 403) {
      const err = "Koneksi ke Kemnaker diblokir Cloudflare (HTTP 403 Forbidden). Coba beberapa saat lagi atau gunakan koneksi lain.";
      await notifyAuthError(err, username);
      return { success: false, error: err };
    }

    if (resLoginPage.status === 429) {
      const err = "Terlalu banyak permintaan ke server Kemnaker (HTTP 429 Too Many Requests). Tunggu beberapa menit.";
      await notifyAuthError(err, username);
      return { success: false, error: err };
    }

    if (resLoginPage.status >= 500) {
      const err = `Server login Kemnaker sedang gangguan/maintenance (HTTP ${resLoginPage.status}).`;
      await notifyAuthError(err, username);
      return { success: false, error: err };
    }

    const htmlLogin = await resLoginPage.text();
    const csrfMatch = htmlLogin.match(
      /<meta[^>]*name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i
    );
    const csrfToken =
      csrfMatch?.[1] || process.env.MONEV_CSRF_TOKEN?.trim() || "";

    if (!csrfToken) {
      const snippet = htmlLogin.slice(0, 300).replace(/\s+/g, " ");
      const detail = `Gagal menemukan CSRF token (HTTP ${resLoginPage.status}). Cuplikan HTML: ${snippet}`;
      await notifyAuthError(detail, username);
      return {
        success: false,
        error: "Gagal menemukan CSRF token dari halaman login Kemnaker.",
      };
    }

    // Step 2: POST credentials to account.kemnaker.go.id/auth/login
    const loginRes = await fetch("https://account.kemnaker.go.id/auth/login", {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "X-CSRF-TOKEN": csrfToken,
        Cookie: getCookieHeader(),
        Origin: "https://account.kemnaker.go.id",
        Referer: "https://account.kemnaker.go.id/auth/login",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    loginRes.headers.getSetCookie?.().forEach((c) => {
      const [kv] = c.split(";");
      const [k, v] = kv.split("=");
      if (k && v) cookieMap[k.trim()] = v.trim();
    });

    const loginData = (await loginRes.json().catch(() => null)) as any;
    if (!loginRes.ok || !loginData?.data?.authenticated) {
      const msg = loginData?.message || "Email atau password Kemnaker salah.";
      const err = `Login Kemnaker gagal: ${msg}`;
      await notifyAuthError(err, username);
      return {
        success: false,
        error: err,
      };
    }

    // Step 3: Call authorize URL with authenticated session to get Authorization Code
    const authRes2 = await fetch(authUrl, {
      headers: {
        Cookie: getCookieHeader(),
        ...BROWSER_HEADERS,
      },
      redirect: "manual",
    });

    const targetUrl = authRes2.headers.get("location");
    if (!targetUrl) {
      const err = "Gagal mendapatkan redirect authorization code dari Kemnaker.";
      await notifyAuthError(err, username);
      return {
        success: false,
        error: err,
      };
    }

    const urlObj = new URL(targetUrl, "https://monev.maganghub.kemnaker.go.id");
    const code = urlObj.searchParams.get("code");
    const returnedState = urlObj.searchParams.get("state");

    if (!code || !returnedState) {
      const err = "Authorization code atau state tidak ditemukan pada respon OAuth.";
      await notifyAuthError(err, username);
      return {
        success: false,
        error: err,
      };
    }

    // Step 4: Token exchange with monev-api
    const callbackUrl = `https://monev-api.maganghub.kemnaker.go.id/api/v1/auth/login/callback?code=${encodeURIComponent(
      code
    )}&state=${encodeURIComponent(returnedState)}`;

    const tokenRes = await fetch(callbackUrl, {
      headers: {
        Accept: "application/json, text/plain, */*",
        Origin: "https://monev.maganghub.kemnaker.go.id",
        Referer: "https://monev.maganghub.kemnaker.go.id/",
        Cookie: `monev_oauth_state=${returnedState}`,
        "User-Agent": USER_AGENT,
      },
    });

    const tokenData = (await tokenRes.json().catch(() => null)) as any;

    if (!tokenRes.ok || !tokenData?.access_token) {
      const err = tokenData?.message || `Token exchange gagal dengan status HTTP ${tokenRes.status}`;
      await notifyAuthError(err, username);
      return {
        success: false,
        error: err,
      };
    }

    // Capture the 30-day monev_refresh_token from Set-Cookie header
    let refreshToken: string | undefined;
    const monevCookies = tokenRes.headers.getSetCookie?.() || [];
    for (const cookieStr of monevCookies) {
      const match = cookieStr.match(/monev_refresh_token=([^;]+)/);
      if (match) {
        refreshToken = match[1];
        break;
      }
    }

    return {
      success: true,
      access_token: tokenData.access_token,
      refresh_token: refreshToken,
      user_id: tokenData.user_id,
      name: tokenData.name,
    };
  } catch (err: any) {
    const errorMsg = `Gagal proses login Kemnaker: ${err.message || String(err)}`;
    await notifyAuthError(errorMsg, username);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Refreshes an expired access_token using the 30-day monev_refresh_token
 */
export async function refreshMonevToken(
  refreshToken: string
): Promise<{
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  error?: string;
}> {
  if (!refreshToken) {
    return {
      success: false,
      error: "Refresh token tidak tersedia.",
    };
  }

  try {
    const res = await fetch(
      "https://monev-api.maganghub.kemnaker.go.id/api/v1/auth/refresh",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          Origin: "https://monev.maganghub.kemnaker.go.id",
          Referer: "https://monev.maganghub.kemnaker.go.id/",
          Cookie: `monev_refresh_token=${refreshToken}`,
          "User-Agent": USER_AGENT,
        },
      }
    );

    const data = (await res.json().catch(() => null)) as any;

    if (!res.ok || !data?.access_token) {
      return {
        success: false,
        error: data?.message || `Refresh token gagal (HTTP ${res.status})`,
      };
    }

    // Capture rotated refresh token if issued
    let newRefreshToken: string | undefined;
    const cookies = res.headers.getSetCookie?.() || [];
    for (const cookieStr of cookies) {
      const match = cookieStr.match(/monev_refresh_token=([^;]+)/);
      if (match) {
        newRefreshToken = match[1];
        break;
      }
    }

    return {
      success: true,
      access_token: data.access_token,
      refresh_token: newRefreshToken || refreshToken,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error saat refresh token: ${err.message || String(err)}`,
    };
  }
}
