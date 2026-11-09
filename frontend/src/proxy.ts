import { SESSION_COOKIE, SESSION_TTL_MS } from "@smartpathy/shared";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * AC18.3: sends visitors without a session to the login screen. Whether a session is
 * still valid only the backend knows; an expired one is redirected when the API answers 401.
 */
export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (!session) {
    if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // AC18.5: the pages call the API from the server, so the browser never sees a
  // renewed cookie from it. Without this it would expire 7 days after the login.
  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
