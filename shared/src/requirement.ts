import { z } from "zod";
import { pathyCodeSchema, type PersonaDto } from "./pathy.js";

export const REQUIREMENT_TYPES = ["functional", "non_functional"] as const;
export const requirementTypeSchema = z.enum(REQUIREMENT_TYPES);
export type RequirementType = z.infer<typeof requirementTypeSchema>;

export const MOSCOW_VALUES = ["must", "should", "could", "wont"] as const;
export const moscowSchema = z.enum(MOSCOW_VALUES);
export type Moscow = z.infer<typeof moscowSchema>;

export const PRIORITIES = ["high", "medium", "low"] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof prioritySchema>;

const CODE_PREFIX: Record<RequirementType, string> = {
  functional: "FR",
  non_functional: "NFR",
};

export const requirementSchema = z
  .object({
    code: z.string().regex(/^N?FR\d+$/, "Expected a code like FR1 or NFR1"),
    type: requirementTypeSchema,
    description: z.string().trim().min(1),
    moscow: moscowSchema,
    priority: prioritySchema,
    derivedFrom: z.array(pathyCodeSchema).min(1),
  })
  .refine(
    (req) => new RegExp(`^${CODE_PREFIX[req.type]}\\d+$`).test(req.code),
    {
      message: "Code prefix does not match requirement type",
      path: ["code"],
    },
  );
export type Requirement = z.infer<typeof requirementSchema>;

/**
 * Orders codes by type (FR before NFR) and then numerically, so FR2 comes
 * before FR10 (AC6.5).
 */
export function compareRequirementCodes(a: string, b: string): number {
  const [, prefixA = "", numberA = "0"] = /^(\D*)(\d*)$/.exec(a) ?? [];
  const [, prefixB = "", numberB = "0"] = /^(\D*)(\d*)$/.exec(b) ?? [];
  return prefixA.localeCompare(prefixB) || Number(numberA) - Number(numberB);
}

export const MAX_GENERATED_REQUIREMENTS = 30;

export const requirementListSchema = z.object({
  requirements: z
    .array(requirementSchema)
    .min(1)
    .max(MAX_GENERATED_REQUIREMENTS),
});
export type RequirementList = z.infer<typeof requirementListSchema>;

/** What PATHY4RE must return: both types (AC5.3) and unique codes (AC5.5). */
export const generatedRequirementsSchema = requirementListSchema.superRefine(
  ({ requirements }, ctx) => {
    for (const type of REQUIREMENT_TYPES) {
      if (!requirements.some((req) => req.type === type)) {
        ctx.addIssue({
          code: "custom",
          message: `Expected at least one ${type} requirement`,
          path: ["requirements"],
        });
      }
    }
    const seen = new Set<string>();
    requirements.forEach((req, index) => {
      if (seen.has(req.code)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate requirement code ${req.code}`,
          path: ["requirements", index, "code"],
        });
      }
      seen.add(req.code);
    });
  },
);

/** AC13.1: each "Generate more requirements" adds at most this many. */
export const ADDITIONAL_FUNCTIONAL_TARGET = 5;
export const ADDITIONAL_NON_FUNCTIONAL_TARGET = 3;
export const ADDITIONAL_REQUIREMENTS_BATCH =
  ADDITIONAL_FUNCTIONAL_TARGET + ADDITIONAL_NON_FUNCTIONAL_TARGET;

/** The initial 16 requirements plus three additional generations. */
export const MAX_REQUIREMENTS_PER_PERSONA = 40;

/** AC13.1 / AC13.4: the same validation as US5, limited to the size of a batch. */
export const additionalRequirementsSchema = generatedRequirementsSchema.refine(
  ({ requirements }) => requirements.length <= ADDITIONAL_REQUIREMENTS_BATCH,
  {
    message: `Expected at most ${ADDITIONAL_REQUIREMENTS_BATCH} requirements`,
    path: ["requirements"],
  },
);

/** Whether a persona with this many requirements has room for another batch. */
export function canGenerateMoreRequirements(existingCount: number): boolean {
  return (
    existingCount > 0 &&
    existingCount + ADDITIONAL_REQUIREMENTS_BATCH <= MAX_REQUIREMENTS_PER_PERSONA
  );
}

/** AC13.3: renumbers new requirements so each type continues after its highest code in use. */
export function continueRequirementCodes(
  existingCodes: string[],
  additions: Requirement[],
): Requirement[] {
  const highest = (type: RequirementType) =>
    Math.max(
      0,
      ...existingCodes.flatMap((code) => {
        const match = new RegExp(`^${CODE_PREFIX[type]}(\\d+)$`).exec(code);
        return match ? [Number(match[1])] : [];
      }),
    );
  const next = { functional: highest("functional"), non_functional: highest("non_functional") };
  return additions.map((req) => ({ ...req, code: `${CODE_PREFIX[req.type]}${++next[req.type]}` }));
}

export const REQUIREMENT_TYPE_LABELS: Record<RequirementType, string> = {
  functional: "Functional",
  non_functional: "Non-functional",
};

export const MOSCOW_LABELS: Record<Moscow, string> = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Requirement as returned by the API. */
export type RequirementDto = Requirement & {
  id: string;
  projectId: string;
  personaId: string;
  /** AC13.5: part of the latest additional generation. */
  isNew: boolean;
  createdAt: string; // ISO 8601
};

/**
 * AC7.5: true when the persona changed after the requirements were generated,
 * so they reflect a previous version of it.
 */
export function isRequirementsOutdated(
  persona: Pick<PersonaDto, "updatedAt">,
  requirements: Pick<RequirementDto, "createdAt">[],
): boolean {
  if (requirements.length === 0) return false;
  const generatedAt = Math.min(...requirements.map((req) => Date.parse(req.createdAt)));
  return Date.parse(persona.updatedAt) > generatedAt;
}
