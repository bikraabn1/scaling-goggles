import { createCookieSessionStorage, redirect } from "react-router";

const sessionSecret = process.env.SESSION_SECRET || "default_insecure_secret_ngabsennn_dev_only";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__ngabsen_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getSession(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  return sessionStorage.getSession(cookieHeader);
}

export async function requireUserSession(request: Request) {
  const session = await getSession(request);
  const isAuthenticated = session.get("authenticated") === true;

  if (!isAuthenticated) {
    throw redirect("/login");
  }

  return session;
}

export async function createUserSession(request: Request) {
  const session = await getSession(request);
  session.set("authenticated", true);
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
