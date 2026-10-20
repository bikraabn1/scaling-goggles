import { createCookieSessionStorage, redirect } from "react-router";

const sessionSecret = process.env.SESSION_SECRET || "default_insecure_secret_ngabsennn_dev_only";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__ngabsen_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days session
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
  },
});

export interface UserSessionData {
  userId: string;
  name: string;
  monevAccessToken: string;
  monevRefreshToken?: string;
  loginAt: string;
}

export async function getSession(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  return sessionStorage.getSession(cookieHeader);
}

export async function requireUserSession(request: Request): Promise<{
  session: Awaited<ReturnType<typeof getSession>>;
  user: UserSessionData;
}> {
  const session = await getSession(request);
  const isAuthenticated = session.get("authenticated") === true;
  const monevAccessToken = session.get("monev_access_token");

  if (!isAuthenticated || !monevAccessToken) {
    throw redirect("/login");
  }

  const user: UserSessionData = {
    userId: session.get("user_id") || "",
    name: session.get("name") || "Pengguna",
    monevAccessToken: session.get("monev_access_token") || "",
    monevRefreshToken: session.get("monev_refresh_token") || "",
    loginAt: session.get("loginAt") || "",
  };

  return { session, user };
}

export async function createUserSession(
  request: Request,
  authData: {
    userId: string;
    name: string;
    accessToken: string;
    refreshToken?: string;
  }
) {
  const session = await getSession(request);
  session.set("authenticated", true);
  session.set("user_id", authData.userId);
  session.set("name", authData.name);
  session.set("monev_access_token", authData.accessToken);
  if (authData.refreshToken) {
    session.set("monev_refresh_token", authData.refreshToken);
  }
  session.set("loginAt", new Date().toISOString());

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function destroyUserSession(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
