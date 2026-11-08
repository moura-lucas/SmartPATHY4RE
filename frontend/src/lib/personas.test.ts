import { describe, expect, it } from "vitest";
import { buildPersona } from "@/test/fixtures";
import { personaQuery, selectPersona } from "./personas";

const ana = buildPersona();
const bruno = buildPersona({ id: "persona-2", name: "Bruno" });

describe("selectPersona", () => {
  it("returns the requested persona", () => {
    expect(selectPersona([ana, bruno], "persona-2")).toBe(bruno);
  });

  it.each([undefined, "deleted", ["persona-2", "persona-1"]])(
    "falls back to the oldest for %s",
    (requested) => {
      expect(selectPersona([ana, bruno], requested)).toBe(ana);
    },
  );

  it("returns undefined when there are no personas", () => {
    expect(selectPersona([], "persona-1")).toBeUndefined();
  });
});

describe("personaQuery", () => {
  it("builds the query string", () => {
    expect(personaQuery("persona-1")).toBe("?persona=persona-1");
  });
});
