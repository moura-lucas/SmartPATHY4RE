import { describe, expect, it } from "vitest";
import { PATHY_CODES, type ProjectDto } from "@smartpathy/shared";
import { buildPersonaPrompt, PERSONA_SYSTEM_PROMPT } from "./persona.prompt.js";

const project: ProjectDto = {
  id: "project-1",
  name: "Clinic App",
  domain: "Healthcare",
  description: "App for nurses to manage patient records.",
  additionalContext: "Used during night shifts.",
  personaName: null,
  personaAge: null,
  techExperienceLevel: "low",
  createdAt: "2026-10-09T12:00:00.000Z",
};

const profile = { techExperienceLevel: "low" } as const;

describe("buildPersonaPrompt", () => {
  it("uses the SmartPATHY system prompt", () => {
    expect(buildPersonaPrompt(project, profile).system).toBe(PERSONA_SYSTEM_PROMPT);
  });

  it("includes the application context (AC3.1)", () => {
    const { prompt } = buildPersonaPrompt(project, profile);

    expect(prompt).toContain("Clinic App");
    expect(prompt).toContain("Healthcare");
    expect(prompt).toContain("App for nurses to manage patient records.");
    expect(prompt).toContain("Used during night shifts.");
  });

  it("marks the additional context as absent when it was not provided", () => {
    const { prompt } = buildPersonaPrompt({ ...project, additionalContext: null }, profile);

    expect(prompt).toContain("Additional context: none");
  });

  it("instructs the LLM to use exactly the provided name and age (AC3.3)", () => {
    const { prompt } = buildPersonaPrompt(project, {
      name: "Ana",
      age: 34,
      techExperienceLevel: "low",
    });

    expect(prompt).toContain('Name: "Ana" (use exactly this value)');
    expect(prompt).toContain("Age: 34 (use exactly this value)");
    expect(prompt).not.toContain("Suggest a name");
    expect(prompt).not.toContain("Suggest an age");
  });

  it("asks the LLM to suggest the name and age when omitted (AC3.4)", () => {
    const { prompt } = buildPersonaPrompt(project, profile);

    expect(prompt).toContain("Suggest a name consistent with the application context");
    expect(prompt).toContain("Suggest an age consistent with the application context");
  });

  it.each([
    ["low", "LOW technology experience"],
    ["moderate", "MODERATE technology experience"],
    ["high", "HIGH technology experience"],
  ] as const)(
    "reflects the %s experience level in E1 to E7 (AC3.5)",
    (level, guidance) => {
      const { prompt } = buildPersonaPrompt(project, { techExperienceLevel: level });

      expect(prompt).toContain(`Technology experience level: ${level}`);
      expect(prompt).toContain("Experience with Technology (E1 to E7) MUST reflect");
      expect(prompt).toContain(guidance);
    },
  );

  it("lists every PATHY field of the template (AC3.2)", () => {
    const { prompt } = buildPersonaPrompt(project, profile);

    for (const code of PATHY_CODES) {
      expect(prompt).toMatch(new RegExp(`^- ${code} → `, "m"));
    }
  });

  it("asks for a different person when the project already has personas (AC12.2)", () => {
    const { prompt } = buildPersonaPrompt(project, profile, ["Ana", "Bruno"]);

    expect(prompt).toContain('already has the personas "Ana", "Bruno"');
  });

  it("does not mention other personas for the first one", () => {
    expect(buildPersonaPrompt(project, profile).prompt).not.toContain("already has the personas");
  });
});
