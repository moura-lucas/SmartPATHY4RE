import { describe, expect, it } from "vitest";
import { PATHY_CODES, PATHY_FIELDS, PATHY_SECTIONS, personaSchema } from "./pathy.js";

describe("PATHY catalog", () => {
  it("lists every PATHY code exactly once, in order", () => {
    expect(PATHY_FIELDS.map((f) => f.code)).toEqual([...PATHY_CODES]);
  });

  it("maps every persona field to a PATHY code", () => {
    const catalogFields = PATHY_FIELDS.map((f) => `${f.section}.${f.field}`).sort();
    const schemaFields = PATHY_SECTIONS.flatMap(({ key }) =>
      Object.keys(personaSchema.shape[key].shape).map((field) => `${key}.${field}`),
    ).sort();

    expect(catalogFields).toEqual(schemaFields);
  });
});
