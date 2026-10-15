import { describe, expect, it } from "vitest";
import {
  compareRequirementCodes,
  generatedRequirementsSchema,
  MAX_GENERATED_REQUIREMENTS,
  requirementSchema,
} from "./requirement.js";

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

describe("generatedRequirementsSchema (US5)", () => {
  const nfr = {
    ...validRequirement,
    code: "NFR1",
    type: "non_functional",
    description: "The system shall respond in under 2 seconds.",
  };

  it("accepts functional and non-functional requirements with unique codes", () => {
    const result = generatedRequirementsSchema.safeParse({
      requirements: [validRequirement, { ...validRequirement, code: "FR2" }, nfr],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a list without non-functional requirements (AC5.3)", () => {
    const result = generatedRequirementsSchema.safeParse({ requirements: [validRequirement] });
    expect(result.success).toBe(false);
  });

  it("rejects a list without functional requirements (AC5.3)", () => {
    const result = generatedRequirementsSchema.safeParse({ requirements: [nfr] });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate codes (AC5.5)", () => {
    const result = generatedRequirementsSchema.safeParse({
      requirements: [validRequirement, { ...validRequirement }, nfr],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["requirements", 1, "code"]);
  });

  it("rejects an invalid requirement inside the list (AC5.4)", () => {
    const result = generatedRequirementsSchema.safeParse({
      requirements: [{ ...validRequirement, moscow: "maybe" }, nfr],
    });
    expect(result.success).toBe(false);
  });

  it("caps the number of generated requirements", () => {
    const many = Array.from({ length: MAX_GENERATED_REQUIREMENTS }, (_, i) => ({
      ...validRequirement,
      code: `FR${i + 1}`,
    }));
    const result = generatedRequirementsSchema.safeParse({ requirements: [...many, nfr] });
    expect(result.success).toBe(false);
  });
});

describe("compareRequirementCodes (US6)", () => {
  it("sorts by the numeric part of the code (AC6.5)", () => {
    expect(["FR10", "FR2", "FR1"].sort(compareRequirementCodes)).toEqual(["FR1", "FR2", "FR10"]);
  });

  it("puts functional codes before non-functional ones", () => {
    expect(["NFR1", "FR10", "NFR2", "FR3"].sort(compareRequirementCodes)).toEqual([
      "FR3",
      "FR10",
      "NFR1",
      "NFR2",
    ]);
  });
});
