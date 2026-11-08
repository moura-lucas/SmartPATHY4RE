import type { PersonaDto } from "@smartpathy/shared";

/** The "?persona=" part of the persona and requirements screens' URLs. */
export function personaQuery(personaId: string): string {
  return `?persona=${encodeURIComponent(personaId)}`;
}

/** AC12.3: the persona named in the URL, or the oldest one when absent or no longer valid. */
export function selectPersona(
  personas: PersonaDto[],
  requested: string | string[] | undefined,
): PersonaDto | undefined {
  return personas.find(({ id }) => id === requested) ?? personas[0];
}
