import { describe, expect, it } from "vitest";
import { validateCreateProject } from "./project.js";

const valid = {
  name: "Clinic App",
  domain: "Healthcare",
  description: "App for nurses to manage patient records.",
  techExperienceLevel: "low",
};

describe("validateCreateProject", () => {
  it("reports every missing mandatory field", () => {
    const result = validateCreateProject({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "description",
      "domain",
      "name",
      "techExperienceLevel",
    ]);
  });

  it("treats blank optional fields as absent", () => {
    const result = validateCreateProject({
      ...valid,
      additionalContext: "",
      personaName: "   ",
    });
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        additionalContext: undefined,
        personaName: undefined,
      }),
    });
  });

  it("accepts a project with only the mandatory fields", () => {
    expect(validateCreateProject(valid).success).toBe(true);
  });

  it("trims leading and trailing whitespace from text fields", () => {
    const result = validateCreateProject({
      ...valid,
      name: "  Clinic App  ",
      personaName: "  Ana ",
    });
    expect(result.success && result.data).toMatchObject({
      name: "Clinic App",
      personaName: "Ana",
    });
  });

  it("rejects a mandatory field containing only whitespace", () => {
    const result = validateCreateProject({ ...valid, name: "   " });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors.name).toEqual(["Project name is required"]);
  });

  it.each([
    ["name", 120],
    ["domain", 80],
    ["description", 5000],
    ["additionalContext", 5000],
    ["personaName", 80],
  ] as const)("limits %s to %i characters", (field, max) => {
    expect(validateCreateProject({ ...valid, [field]: "a".repeat(max) }).success).toBe(true);

    const result = validateCreateProject({ ...valid, [field]: "a".repeat(max + 1) });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.fieldErrors)).toEqual([field]);
  });

  it.each([1, 120])("accepts age %i", (personaAge) => {
    expect(validateCreateProject({ ...valid, personaAge }).success).toBe(true);
  });

  it.each([0, 121, 1.5, Number.NaN, "30"])("rejects age %s", (personaAge) => {
    const result = validateCreateProject({ ...valid, personaAge });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.fieldErrors)).toEqual(["personaAge"]);
  });

  it.each(["low", "moderate", "high"])("accepts experience level %s", (level) => {
    expect(validateCreateProject({ ...valid, techExperienceLevel: level }).success).toBe(true);
  });

  it.each(["expert", "", "LOW"])("rejects experience level %j", (level) => {
    const result = validateCreateProject({ ...valid, techExperienceLevel: level });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.fieldErrors)).toEqual(["techExperienceLevel"]);
  });

  it("returns field errors instead of throwing when the input is undefined", () => {
    const result = validateCreateProject(undefined);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors.name).toBeDefined();
  });
});
