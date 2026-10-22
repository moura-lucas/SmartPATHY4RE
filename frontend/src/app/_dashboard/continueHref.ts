import type { ProjectSummaryDto } from "@smartpathy/shared";

/** AC8.3: the screen of the project's next pending stage. */
export function continueHref({ id, stage }: Pick<ProjectSummaryDto, "id" | "stage">): string {
  switch (stage) {
    case "created":
      return `/projects/${id}`; // has the "Generate Persona" button (AC2.7)
    case "persona_generated":
      return `/projects/${id}/persona`;
    case "requirements_generated":
      return `/projects/${id}/requirements`;
  }
}
