import { z } from "zod";
import { pathyCodeSchema } from "./pathy.js";

/**
 * Requisito gerado pelo PATHY4RE (Figura 30): código, tipo, descrição,
 * MoSCoW, prioridade e rastreabilidade para os campos da persona (Derived From).
 */

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
  .refine((req) => new RegExp(`^${CODE_PREFIX[req.type]}\\d+$`).test(req.code), {
    message: "Code prefix does not match requirement type",
    path: ["code"],
  });
export type Requirement = z.infer<typeof requirementSchema>;

export const requirementListSchema = z.object({
  requirements: z.array(requirementSchema).min(1),
});
export type RequirementList = z.infer<typeof requirementListSchema>;
