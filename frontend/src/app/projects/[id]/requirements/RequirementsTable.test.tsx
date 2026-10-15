import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildRequirement } from "@/test/fixtures";
import { RequirementsTable } from "./RequirementsTable";

describe("RequirementsTable", () => {
  it("shows code, description, MoSCoW, priority and derived from (AC6.4)", () => {
    render(
      <RequirementsTable
        id="functional"
        title="Functional requirements"
        requirements={[
          buildRequirement({
            code: "FR1",
            description: "Record vital signs.",
            moscow: "wont",
            priority: "medium",
            derivedFrom: ["C1", "P1"],
          }),
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Functional requirements (1)" });
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Code",
      "Description",
      "MoSCoW",
      "Priority",
      "Derived from",
    ]);
    const [, row] = within(table).getAllByRole("row");
    expect(within(row!).getByRole("rowheader")).toHaveTextContent("FR1");
    expect(row).toHaveTextContent("Record vital signs.");
    expect(row).toHaveTextContent("Won't");
    expect(row).toHaveTextContent("Medium");
    expect(within(row!).getByRole("button", { name: "C1" })).toBeInTheDocument();
    expect(within(row!).getByRole("button", { name: "P1" })).toBeInTheDocument();
  });

  it("keeps the order it receives, which the backend sorts by code (AC6.5)", () => {
    render(
      <RequirementsTable
        id="functional"
        title="Functional requirements"
        requirements={["FR1", "FR2", "FR10"].map((code) => buildRequirement({ code }))}
      />,
    );
    expect(screen.getAllByRole("rowheader").map((th) => th.textContent)).toEqual([
      "FR1",
      "FR2",
      "FR10",
    ]);
  });

  it("says so when there are no requirements of this type", () => {
    render(<RequirementsTable id="nfr" title="Non-functional requirements" requirements={[]} />);
    expect(screen.getByText("No non-functional requirements.")).toBeInTheDocument();
  });
});
