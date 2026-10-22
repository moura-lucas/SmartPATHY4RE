import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildProjectSummary } from "@/test/fixtures";
import { DashboardStats } from "./DashboardStats";

describe("DashboardStats", () => {
  it("shows totals of projects, personas and requirements (AC8.2)", () => {
    render(
      <DashboardStats
        projects={[
          buildProjectSummary({ id: "a", hasPersona: true, requirementsCount: 16 }),
          buildProjectSummary({ id: "b", hasPersona: true, requirementsCount: 3 }),
          buildProjectSummary({ id: "c", hasPersona: true }),
          buildProjectSummary({ id: "d" }),
        ]}
      />,
    );

    const overview = screen.getByRole("region", { name: "Overview" });
    const value = (term: string) => within(overview).getByText(term).nextElementSibling;
    expect(value("Projects")).toHaveTextContent("4");
    expect(value("Generated personas")).toHaveTextContent("3");
    expect(value("Generated requirements")).toHaveTextContent("19");
  });
});
