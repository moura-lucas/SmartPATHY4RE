import { describe, expect, it } from "vitest";
import {
  ADDITIONAL_REQUIREMENTS_BATCH,
  additionalRequirementsSchema,
  canGenerateMoreRequirements,
  continueRequirementCodes,
  compareRequirementCodes,
  isRequirementsOutdated,
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

describe("isRequirementsOutdated (US7)", () => {
  const generated = [{ createdAt: "2026-10-14T12:00:00.000Z" }];

  it("is true when the persona changed after the requirements were generated (AC7.5)", () => {
    expect(isRequirementsOutdated({ updatedAt: "2026-10-15T09:00:00.000Z" }, generated)).toBe(true);
  });

  it("is false when the requirements are newer than the persona", () => {
    expect(isRequirementsOutdated({ updatedAt: "2026-10-14T11:59:59.000Z" }, generated)).toBe(false);
    expect(isRequirementsOutdated({ updatedAt: "2026-10-14T12:00:00.000Z" }, generated)).toBe(false);
  });

  it("is false when there are no requirements", () => {
    expect(isRequirementsOutdated({ updatedAt: "2026-10-15T09:00:00.000Z" }, [])).toBe(false);
  });
});

describe("additional requirements (US13)", () => {
  const nfr = { ...validRequirement, code: "NFR1", type: "non_functional" };

  describe("additionalRequirementsSchema", () => {
    it("accepts a batch with both types", () => {
      const result = additionalRequirementsSchema.safeParse({ requirements: [validRequirement, nfr] });
      expect(result.success).toBe(true);
    });

    it("applies the US5 validation (AC13.4)", () => {
      const result = additionalRequirementsSchema.safeParse({ requirements: [validRequirement] });
      expect(result.success).toBe(false);
    });

    it("rejects more requirements than a batch", () => {
      const many = Array.from({ length: ADDITIONAL_REQUIREMENTS_BATCH }, (_, i) => ({
        ...validRequirement,
        code: `FR${i + 1}`,
      }));
      const result = additionalRequirementsSchema.safeParse({ requirements: [...many, nfr] });
      expect(result.success).toBe(false);
    });
  });

  describe("canGenerateMoreRequirements", () => {
    it.each([
      [0, false],
      [16, true],
      [32, true],
      [33, false],
      [40, false],
    ])("with %i existing requirements → %s", (count, expected) => {
      expect(canGenerateMoreRequirements(count)).toBe(expected);
    });
  });

  describe("continueRequirementCodes (AC13.3)", () => {
    const requirement = (code: string, type: "functional" | "non_functional") =>
      requirementSchema.parse({ ...validRequirement, code, type });

    it("continues each type after its highest code", () => {
      const result = continueRequirementCodes(
        ["FR1", "FR8", "NFR1", "NFR2"],
        [requirement("FR1", "functional"), requirement("NFR1", "non_functional"), requirement("FR2", "functional")],
      );
      expect(result.map((r) => r.code)).toEqual(["FR9", "NFR3", "FR10"]);
    });

    it("orders numerically, not alphabetically", () => {
      const [first] = continueRequirementCodes(["FR9", "FR10"], [requirement("FR1", "functional")]);
      expect(first?.code).toBe("FR11");
    });

    it("does not confuse FR with NFR", () => {
      const [first] = continueRequirementCodes(["NFR7"], [requirement("FR1", "functional")]);
      expect(first?.code).toBe("FR1");
    });

    it("keeps the rest of the requirement", () => {
      const [first] = continueRequirementCodes(["FR1"], [requirement("FR1", "functional")]);
      expect(first).toMatchObject({ description: validRequirement.description, moscow: "must" });
    });
  });
});
