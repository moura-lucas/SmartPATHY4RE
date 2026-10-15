import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPersona, getProject, getRequirements } from "@/lib/api";
import { buildPersona, buildProject, buildRequirement } from "@/test/fixtures";
import RequirementsPage from "./page";

vi.mock("@/lib/api", () => ({
  getProject: vi.fn(),
  getPersona: vi.fn(),
  getRequirements: vi.fn(),
  generateRequirements: vi.fn(),
}));

const notFoundError = new Error("NEXT_NOT_FOUND");
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw notFoundError;
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

async function renderPage(id = "project-1") {
  render(await RequirementsPage({ params: Promise.resolve({ id }) } as never));
}

describe("RequirementsPage", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockResolvedValue(buildProject());
    vi.mocked(getPersona).mockResolvedValue(buildPersona());
    vi.mocked(getRequirements).mockResolvedValue([
      buildRequirement({ code: "FR1" }),
      buildRequirement({ code: "FR2" }),
      buildRequirement({ code: "NFR1", priority: "low" }),
    ]);
  });

  it("fetches the project's requirements from the backend (AC6.1)", async () => {
    await renderPage("project-1");
    expect(getRequirements).toHaveBeenCalledWith("project-1");
  });

  it("shows one table per requirement type (AC6.2 / AC6.3)", async () => {
    await renderPage();

    const functional = screen.getByRole("table", { name: "Functional requirements (2)" });
    const nonFunctional = screen.getByRole("table", { name: "Non-functional requirements (1)" });
    expect(within(functional).getAllByRole("rowheader").map((th) => th.textContent)).toEqual([
      "FR1",
      "FR2",
    ]);
    expect(within(nonFunctional).getAllByRole("rowheader").map((th) => th.textContent)).toEqual([
      "NFR1",
    ]);
    const summary = screen.getByRole("region", { name: "Summary" });
    expect(within(summary).getByText("Functional requirements").nextElementSibling).toHaveTextContent("2");
  });

  it("shows the breadcrumb and a way back to the persona (AC6.9)", async () => {
    await renderPage();

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveTextContent("Projects›CareTrack›Persona›Requirements");
    expect(screen.getByRole("link", { name: "Back to persona" })).toHaveAttribute(
      "href",
      "/projects/project-1/persona",
    );
  });

  it("offers to generate requirements when there are none yet (AC6.8)", async () => {
    vi.mocked(getRequirements).mockResolvedValue([]);
    await renderPage();

    expect(screen.getByText("This project does not have requirements yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Requirements" })).toBeEnabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("points to the persona when the project has none", async () => {
    vi.mocked(getPersona).mockResolvedValue(null);
    vi.mocked(getRequirements).mockResolvedValue([]);
    await renderPage();

    expect(screen.getByRole("link", { name: "Go to persona" })).toHaveAttribute(
      "href",
      "/projects/project-1/persona",
    );
    expect(screen.queryByRole("button", { name: "Generate Requirements" })).not.toBeInTheDocument();
  });

  it("is not found when the project does not exist", async () => {
    vi.mocked(getProject).mockResolvedValue(null);
    vi.mocked(getRequirements).mockResolvedValue(null);
    await expect(renderPage("missing")).rejects.toBe(notFoundError);
  });
});
