import { describe, expect, it } from "vitest";
import { createKeyCipher } from "./keyCipher.js";

const cipher = createKeyCipher("a".repeat(64));
const KEY = "AIzaSyExampleKey";

describe("createKeyCipher", () => {
  it("round-trips a key", () => {
    expect(cipher.decrypt("user-1", cipher.encrypt("user-1", KEY))).toBe(KEY);
  });

  it("does not store the key readably", () => {
    expect(cipher.encrypt("user-1", KEY)).not.toContain(KEY);
  });

  it("gives a different result each time", () => {
    expect(cipher.encrypt("user-1", KEY)).not.toBe(cipher.encrypt("user-1", KEY));
  });

  it("refuses a value copied to another account", () => {
    const encrypted = cipher.encrypt("user-1", KEY);

    expect(() => cipher.decrypt("user-2", encrypted)).toThrow();
  });

  it("refuses a tampered value", () => {
    const [iv, tag, content] = cipher.encrypt("user-1", KEY).split(".");
    const changed = Buffer.from(content!, "base64");
    changed[0]! ^= 1;

    expect(() =>
      cipher.decrypt("user-1", [iv, tag, changed.toString("base64")].join(".")),
    ).toThrow();
  });

  it("cannot read a value after the secret changes", () => {
    const encrypted = cipher.encrypt("user-1", KEY);

    expect(() => createKeyCipher("b".repeat(64)).decrypt("user-1", encrypted)).toThrow();
  });
});
