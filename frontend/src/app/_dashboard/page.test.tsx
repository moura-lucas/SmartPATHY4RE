import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listProjects } from "@/lib/api";
import { buildProjectSummary } from "@/test/fixtures";
import Dashboard from "../page";

vi.mock("@/lib/api", () => ({ listProjects: vi.fn() }));

async function renderDashboard() {
  render(await Dashboard());
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockResolvedValue([
      buildProjectSummary({ id: "a", name: "Clinic App", hasPersona: true, requirementsCount: 2 }),
    ]);
  });

  it("shows the indicators and the project list (AC8.1 / AC8.2)", async () => {
    await renderDashboard();

    expect(screen.getByRole("region", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Clinic App" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Welcome to SmartPATHY" })).not.toBeInTheDocument();
  });

  it("links to the project creation form (AC8.4)", async () => {
    await renderDashboard();
    expect(screen.getByRole("link", { name: "New Project" })).toHaveAttribute(
      "href",
      "/projects/new",
    );
  });

  it("welcomes the user and explains the stages when there are no projects (AC8.5)", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    await renderDashboard();

    expect(screen.getByRole("heading", { name: "Welcome to SmartPATHY" })).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent);
    expect(steps).toEqual([
      "Create a project",
      "Generate the persona",
      "Generate requirements",
      "Export",
    ]);
    expect(screen.getAllByRole("link", { name: "New Project" })).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Overview" })).not.toBeInTheDocument();
  });
});
