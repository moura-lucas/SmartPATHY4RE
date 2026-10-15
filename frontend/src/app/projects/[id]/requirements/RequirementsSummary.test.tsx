import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildPersona, buildProject } from "@/test/fixtures";
import { RequirementsSummary } from "./RequirementsSummary";

describe("RequirementsSummary", () => {
  it("shows the application context, persona and counts by type (AC6.2)", () => {
    render(
      <RequirementsSummary
        project={buildProject({ name: "CareTrack", description: "Helps nurses." })}
        persona={buildPersona()}
        functionalCount={7}
        nonFunctionalCount={3}
      />,
    );

    const summary = screen.getByRole("region", { name: "Summary" });
    expect(within(summary).getByText("CareTrack")).toBeInTheDocument();
    expect(within(summary).getByText("Helps nurses.")).toBeInTheDocument();
    for (const [term, value] of [
      ["Name", "Ana"],
      ["Age", "34"],
      ["Profession", "Nurse"],
      ["Technology experience", "Low"],
      ["Functional requirements", "7"],
      ["Non-functional requirements", "3"],
    ]) {
      // Each <dt> is followed by its <dd>.
      expect(within(summary).getByText(term!).nextElementSibling).toHaveTextContent(value!);
    }
  });
});
