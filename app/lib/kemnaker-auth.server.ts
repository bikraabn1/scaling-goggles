import crypto from "crypto";

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
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
    });
    saveCookies(res1.headers);

    const loginPageUrl =
      res1.headers.get("location") || "https://account.kemnaker.go.id/auth/login";
    const resLoginPage = await fetch(loginPageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: getCookieHeader(),
      },
    });
    saveCookies(resLoginPage.headers);

    const htmlLogin = await resLoginPage.text();
    const csrfMatch = htmlLogin.match(
      /<meta[^>]*name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i
    );
    const csrfToken =
      csrfMatch?.[1] || process.env.MONEV_CSRF_TOKEN?.trim() || "";

    if (!csrfToken) {
      return {
        success: false,
        error: "Gagal menemukan CSRF token dari halaman login Kemnaker.",
      };
    }

    // Step 2: POST credentials to account.kemnaker.go.id/auth/login
    const loginRes = await fetch("https://account.kemnaker.go.id/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "X-CSRF-TOKEN": csrfToken,
        Cookie: getCookieHeader(),
        Origin: "https://account.kemnaker.go.id",
        Referer: "https://account.kemnaker.go.id/auth/login",
        "User-Agent": USER_AGENT,
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
      return {
        success: false,
        error: `Login Kemnaker gagal: ${msg}`,
      };
    }

    // Step 3: Call authorize URL with authenticated session to get Authorization Code
    const authRes2 = await fetch(authUrl, {
      headers: {
        Cookie: getCookieHeader(),
        "User-Agent": USER_AGENT,
      },
      redirect: "manual",
    });

    const targetUrl = authRes2.headers.get("location");
    if (!targetUrl) {
      return {
        success: false,
        error: "Gagal mendapatkan redirect authorization code dari Kemnaker.",
      };
    }

    const urlObj = new URL(targetUrl, "https://monev.maganghub.kemnaker.go.id");
    const code = urlObj.searchParams.get("code");
    const returnedState = urlObj.searchParams.get("state");

    if (!code || !returnedState) {
      return {
        success: false,
        error: "Authorization code atau state tidak ditemukan pada respon OAuth.",
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
      return {
        success: false,
        error:
          tokenData?.message ||
          `Token exchange gagal dengan status HTTP ${tokenRes.status}`,
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
    return {
      success: false,
      error: `Gagal proses login Kemnaker: ${err.message || String(err)}`,
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
