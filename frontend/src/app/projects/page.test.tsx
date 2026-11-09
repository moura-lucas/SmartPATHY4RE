import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listProjects } from "@/lib/api";
import { buildProjectSummary } from "@/test/fixtures";
import ProjectsPage from "./page";

vi.mock("@/lib/api", () => ({ listProjects: vi.fn() }));

describe("ProjectsPage", () => {
  it("lists every project, including those beyond the dashboard's recent ones", async () => {
    vi.mocked(listProjects).mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => buildProjectSummary({ id: `p${i}`, name: `Project ${i}` })),
    );
    render(await ProjectsPage());

    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByRole("link", { name: "New Project" })).toHaveAttribute("href", "/projects/new");
  });

  it("shows the welcome steps when there are no projects", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    render(await ProjectsPage());

    expect(screen.getByRole("heading", { name: "Welcome to SmartPATHY" })).toBeInTheDocument();
  });
});
