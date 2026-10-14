import { z } from "zod";
import { pathyCodeSchema } from "./pathy.js";

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
  createdAt: string; // ISO 8601
};
