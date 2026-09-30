import { describe, expect, it } from "vitest";
import { requirementSchema } from "./requirement.js";

const validRequirement = {
  code: "FR1",
  type: "functional",
  description: "The system shall allow nurses to access patient records.",
  moscow: "must",
  priority: "high",
  derivedFrom: ["C1"],
};

describe("requirementSchema", () => {
  it("accepts a valid requirement", () => {
    expect(requirementSchema.safeParse(validRequirement).success).toBe(true);
  });

  it("rejects a code prefix that does not match the type", () => {
    const result = requirementSchema.safeParse({ ...validRequirement, code: "NFR1" });
    expect(result.success).toBe(false);
  });

  it("rejects traceability to an unknown PATHY code", () => {
    const result = requirementSchema.safeParse({ ...validRequirement, derivedFrom: ["X9"] });
    expect(result.success).toBe(false);
  });

  it("requires at least one PATHY code in derivedFrom", () => {
    const result = requirementSchema.safeParse({ ...validRequirement, derivedFrom: [] });
    expect(result.success).toBe(false);
  });
});
