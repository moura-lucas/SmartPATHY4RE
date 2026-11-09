import { describe, expect, it } from "vitest";
import { loginSchema, validateRegister } from "./auth.js";

const valid = { name: "  Ana  ", email: "  ANA@Example.com ", password: "12345678" };

describe("validateRegister (AC18.1)", () => {
  it("accepts valid data, normalizing the name and the email", () => {
    expect(validateRegister(valid)).toEqual({
      success: true,
      data: { name: "Ana", email: "ana@example.com", password: "12345678" },
    });
  });

  it("does not trim the password", () => {
    const result = validateRegister({ ...valid, password: "  1234567 " });
    expect(result.success && result.data.password).toBe("  1234567 ");
  });

  it.each(["not-an-email", "a@", "@b.com", ""])("rejects the email %j", (email) => {
    const result = validateRegister({ ...valid, email });
    expect(result).toEqual({
      success: false,
      fieldErrors: { email: ["Enter a valid email address"] },
    });
  });

  it("requires at least 8 characters in the password", () => {
    expect(validateRegister({ ...valid, password: "1234567" })).toEqual({
      success: false,
      fieldErrors: { password: ["Password must be at least 8 characters"] },
    });
  });

  it("refuses passwords that bcrypt would silently truncate", () => {
    expect(validateRegister({ ...valid, password: "a".repeat(72) }).success).toBe(true);
    expect(validateRegister({ ...valid, password: "a".repeat(73) }).success).toBe(false);
    expect(validateRegister({ ...valid, password: "é".repeat(37) }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(validateRegister({ ...valid, name: "   " })).toEqual({
      success: false,
      fieldErrors: { name: ["Name is required"] },
    });
  });

  it("reports every missing field", () => {
    const result = validateRegister(undefined);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual(["email", "name", "password"]);
    }
  });
});

describe("loginSchema (AC18.2)", () => {
  it("normalizes the email", () => {
    expect(loginSchema.parse({ email: " ANA@x.com ", password: "secret" })).toEqual({
      email: "ana@x.com",
      password: "secret",
    });
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
