import { describe, expect, it } from "vitest";
import { PATHY_FIELDS } from "@smartpathy/shared";
import { buildPersona, project } from "../personas/persona.fixtures.js";
import { buildRequirements } from "./requirement.fixtures.js";
import {
  buildAdditionalRequirementsPrompt,
  buildRequirementsPrompt,
  FUNCTIONAL_TARGET,
  NON_FUNCTIONAL_TARGET,
  REQUIREMENTS_SYSTEM_PROMPT,
} from "./requirement.prompt.js";

describe("buildRequirementsPrompt", () => {
  it("uses the PATHY4RE system prompt", () => {
    expect(buildRequirementsPrompt(project, buildPersona()).system).toBe(
      REQUIREMENTS_SYSTEM_PROMPT,
    );
  });

  it("includes the application context (AC5.2)", () => {
    const { prompt } = buildRequirementsPrompt(
      { ...project, additionalContext: "Used during night shifts." },
      buildPersona(),
    );

    expect(prompt).toContain("Name: Clinic App");
    expect(prompt).toContain("Domain: Healthcare");
    expect(prompt).toContain("App for nurses to manage patient records.");
    expect(prompt).toContain("Used during night shifts.");
  });

  it("says when there is no additional context", () => {
    expect(buildRequirementsPrompt(project, buildPersona()).prompt).toContain(
      "Additional context: none",
    );
  });

  it("includes every persona field with its PATHY code (AC5.2)", () => {
    const persona = buildPersona();
    persona.who.profession = "Night-shift nurse (edited by the user)";

    const { prompt } = buildRequirementsPrompt(project, persona);

    expect(prompt).toContain("Name: Maria");
    expect(prompt).toContain("- W1 (Profession): Night-shift nurse (edited by the user)");
    for (const { code, label } of PATHY_FIELDS) {
      expect(prompt).toContain(`- ${code} (${label}): `);
    }
  });

  it("asks for the target number of each requirement type", () => {
    const { prompt } = buildRequirementsPrompt(project, buildPersona());

    expect(prompt).toContain(`exactly ${FUNCTIONAL_TARGET} functional requirements`);
    expect(prompt).toContain(`${NON_FUNCTIONAL_TARGET} non-functional requirements`);
  });
});

describe("buildAdditionalRequirementsPrompt (AC13.2)", () => {
  const build = () =>
    buildAdditionalRequirementsPrompt(project, buildPersona(), buildRequirements()).prompt;

  it("keeps the application context and the persona", () => {
    expect(build()).toContain("Domain: Healthcare");
    expect(build()).toContain("- W1 (Profession): Nurse");
  });

  it("lists the requirements the persona already has", () => {
    for (const { code, description } of buildRequirements()) {
      expect(build()).toContain(`- ${code} `);
      expect(build()).toContain(description);
    }
  });

  it("forbids repetition and asks for aspects not yet addressed", () => {
    expect(build()).toContain("Do NOT repeat or rephrase");
    expect(build()).toContain("not yet addressed");
  });

  it("asks for the size of a batch", () => {
    expect(build()).toContain("exactly 5 functional requirements");
    expect(build()).toContain("3 non-functional requirements");
  });
});
