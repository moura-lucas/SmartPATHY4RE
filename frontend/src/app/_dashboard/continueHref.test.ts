import { describe, expect, it } from "vitest";
import { continueHref } from "./continueHref";

describe("continueHref", () => {
  it("goes to the next pending stage (AC8.3)", () => {
    expect(continueHref({ id: "p1", stage: "created" })).toBe("/projects/p1");
    expect(continueHref({ id: "p1", stage: "persona_generated" })).toBe("/projects/p1/persona");
    expect(continueHref({ id: "p1", stage: "requirements_generated" })).toBe(
      "/projects/p1/requirements",
    );
  });
});
