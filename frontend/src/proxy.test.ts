// @vitest-environment node
import { SESSION_COOKIE } from "@smartpathy/shared";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function visit(path: string, session?: string) {
  const headers: HeadersInit = session ? { cookie: `${SESSION_COOKIE}=${session}` } : {};
  return proxy(new NextRequest(new URL(path, "http://localhost:3000"), { headers }));
}

describe("proxy (AC18.3)", () => {
  it.each(["/", "/projects/new", "/projects/1/persona"])(
    "redirects %s to the login screen without a session",
    (path) => {
      const response = visit(path);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    },
  );

  it.each(["/login", "/register"])("lets visitors reach %s", (path) => {
    expect(visit(path).headers.get("location")).toBeNull();
  });

  it("lets a session through", () => {
    expect(visit("/projects/new", "token").headers.get("location")).toBeNull();
  });

  it("renews the cookie on each page, keeping it httpOnly (AC18.5)", () => {
    const cookie = visit("/", "token").headers.get("set-cookie");

    expect(cookie).toContain(`${SESSION_COOKIE}=token`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=604800/i);
  });
});
