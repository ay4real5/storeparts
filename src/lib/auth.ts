import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { authSecret, config } from "./config";

export const SESSION_COOKIE = "admin_session";
const SESSION_DAYS = 7;

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(authSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ userId: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret(), { algorithms: ["HS256"] });
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
