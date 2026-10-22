import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildProjectSummary } from "@/test/fixtures";
import { ProjectList } from "./ProjectList";

describe("ProjectList", () => {
  it("shows name, domain, creation date, stage and requirements count (AC8.1)", () => {
    render(
      <ProjectList
        projects={[
          buildProjectSummary({
            name: "Clinic App",
            domain: "Healthcare",
            createdAt: "2026-10-14T12:00:00.000Z",
            hasPersona: true,
            requirementsCount: 16,
          }),
        ]}
      />,
    );

    const [item] = screen.getAllByRole("listitem");
    expect(within(item!).getByRole("heading", { name: "Clinic App" })).toBeInTheDocument();
    expect(item).toHaveTextContent("Healthcare · Created on Oct 14, 2026");
    expect(item).toHaveTextContent("Requirements generated");
    expect(item).toHaveTextContent("16 requirements");
  });

  it("keeps the backend order, newest first (AC8.1)", () => {
    render(
      <ProjectList
        projects={["Newest", "Middle", "Oldest"].map((name) =>
          buildProjectSummary({ id: name, name }),
        )}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  it("continues each project at its next pending stage (AC8.3)", () => {
    render(
      <ProjectList
        projects={[
          buildProjectSummary({ id: "fresh", name: "New one" }),
          buildProjectSummary({ id: "persona", name: "With persona", hasPersona: true }),
          buildProjectSummary({
            id: "done",
            name: "With requirements",
            hasPersona: true,
            requirementsCount: 1,
          }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Continue New one" })).toHaveAttribute(
      "href",
      "/projects/fresh",
    );
    expect(screen.getByRole("link", { name: "Continue With persona" })).toHaveAttribute(
      "href",
      "/projects/persona/persona",
    );
    expect(screen.getByRole("link", { name: "Continue With requirements" })).toHaveAttribute(
      "href",
      "/projects/done/requirements",
    );
    expect(screen.getByText("1 requirement")).toBeInTheDocument();
  });
});
