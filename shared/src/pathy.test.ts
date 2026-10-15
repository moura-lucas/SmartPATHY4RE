import { describe, expect, it } from "vitest";
import {
  PATHY_CODES,
  PATHY_FIELDS,
  PATHY_SECTIONS,
  pathyAnswer,
  pathyField,
  pathyFieldLabel,
  pathyFieldsOf,
  personaSchema,
  type Persona,
} from "./pathy.js";

// Returns a new, fully valid persona on each call, so tests can mutate it freely.
function buildValidPersona(): Persona {
  return {
    name: "Ana",
    age: 34,
    techExperienceLevel: "low",
    who: {
      profession: "Nurse",
      educationLevel: "Bachelor's degree in nursing",
      selfDescription: "Caring and organized, but always short on time.",
      fearsConcernsFrustrations:
        "Afraid of making mistakes in patient records.",
    },
    context: {
      routineTasks: "Records vital signs and checks medication schedules.",
    },
    experienceWithTechnology: {
      likedParts: "Simple screens with large buttons.",
      dislikedParts: "Long forms and technical jargon.",
      devicesUsed: "Smartphone and the hospital's shared desktop.",
      howLearnsNewApplications: "Asks colleagues to show her step by step.",
      stepByStepOrShortcuts: "Prefers step-by-step guidance.",
      informationProcessingStyle: "Reads carefully and prefers visual cues.",
      virtualSocialBehaviour: "Uses messaging apps only with close colleagues.",
    },
    problems: {
      routineProblems: "Loses time switching between paper and the system.",
      howApplicationCanHelp: "Centralizes patient records in one quick screen.",
    },
    existingSolutions: {
      existingTechnologies: "Paper charts and a legacy hospital system.",
      positiveCharacteristics: "Paper is always available, even offline.",
      negativeCharacteristics: "The legacy system is slow and confusing.",
    },
  };
}

describe("PATHY catalog", () => {
  it("lists every PATHY code exactly once, in order", () => {
    expect(PATHY_FIELDS.map((f) => f.code)).toEqual([...PATHY_CODES]);
  });

  it("maps every persona field to a PATHY code", () => {
    const catalogFields = PATHY_FIELDS.map(
      (f) => `${f.section}.${f.field}`,
    ).sort();
    const schemaFields = PATHY_SECTIONS.flatMap(({ key }) =>
      Object.keys(personaSchema.shape[key].shape).map(
        (field) => `${key}.${field}`,
      ),
    ).sort();

    expect(catalogFields).toEqual(schemaFields);
  });

  it("rejects a persona with a blank PATHY field (AC3.2)", () => {
    const persona = buildValidPersona();
    persona.problems.routineProblems = "   ";
    expect(personaSchema.safeParse(persona).success).toBe(false);
  });
});

describe("catalog helpers (US4)", () => {
  it("lists each section's fields in catalog order (AC4.3 / AC4.4)", () => {
    expect(pathyFieldsOf("who").map((f) => f.code)).toEqual(["W1", "W2", "W3", "W4"]);
    expect(pathyFieldsOf("problems").map((f) => f.code)).toEqual(["P1", "P2"]);
    expect(
      PATHY_SECTIONS.flatMap(({ key }) => pathyFieldsOf(key).map((f) => f.code)),
    ).toEqual([...PATHY_CODES]);
  });

  it("reads the persona's answer for a catalog field", () => {
    const persona = buildValidPersona();
    const [w1] = pathyFieldsOf("who");
    const s3 = PATHY_FIELDS.find((f) => f.code === "S3")!;

    expect(pathyAnswer(persona, w1!)).toBe("Nurse");
    expect(pathyAnswer(persona, s3)).toBe(persona.existingSolutions.negativeCharacteristics);
  });
});

describe("traceability helpers (US6)", () => {
  it("finds the catalog field of every PATHY code", () => {
    for (const code of PATHY_CODES) expect(pathyField(code).code).toBe(code);
    expect(pathyField("W1").field).toBe("profession");
  });

  it("labels a code with its catalog field (AC6.7)", () => {
    expect(pathyFieldLabel("C1")).toBe("C1 — Routine tasks using applications");
  });
});
