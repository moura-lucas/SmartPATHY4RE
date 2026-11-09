import { render, screen } from "@testing-library/react";
import { PATHY_SECTIONS } from "@smartpathy/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPersonas, getProject, getRequirements } from "@/lib/api";
import { buildPersona, buildProject, buildRequirement } from "@/test/fixtures";
import PersonaPage from "./page";

vi.mock("@/lib/api", () => ({
  getProject: vi.fn(),
  getPersonas: vi.fn(),
  getRequirements: vi.fn(),
  updatePersona: vi.fn(),
  generatePersona: vi.fn(),
  generateRequirements: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

async function renderPage(query: Record<string, string> = {}) {
  render(
    await PersonaPage({
      params: Promise.resolve({ id: "project-1" }),
      searchParams: Promise.resolve(query),
    } as never),
  );
}

const bruno = buildPersona({ id: "persona-2", name: "Bruno", techExperienceLevel: "high" });

const WARNING = "Requirements may be outdated";

describe("PersonaPage", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockResolvedValue(buildProject());
    vi.mocked(getPersonas).mockResolvedValue([
      buildPersona({ updatedAt: "2026-10-14T12:00:00.000Z" }),
    ]);
    vi.mocked(getRequirements).mockResolvedValue([
      buildRequirement({ createdAt: "2026-10-14T13:00:00.000Z" }),
    ]);
  });

  it("marks each section with its icon", async () => {
    await renderPage();

    for (const name of ["Who", "Context", "Experience with Technology", "Problems", "Existing Solutions"]) {
      expect(screen.getByRole("heading", { name }).querySelector("svg")).toBeInTheDocument();
    }
  });

  it("explains where the persona came from", async () => {
    await renderPage();
    expect(screen.getByRole("region", { name: "About this persona" })).toHaveTextContent(
      "strictly aligned with the PATHY framework",
    );
  });

  it("offers an Edit button for each of the five sections (AC7.1)", async () => {
    await renderPage();
    for (const { label } of PATHY_SECTIONS) {
      expect(screen.getByRole("button", { name: `Edit ${label}` })).toBeEnabled();
    }
  });

  it("warns when the persona changed after the requirements were generated (AC7.5)", async () => {
    vi.mocked(getPersonas).mockResolvedValue([
      buildPersona({ updatedAt: "2026-10-15T09:00:00.000Z" }),
    ]);
    await renderPage();

    expect(screen.getByRole("note", { name: WARNING })).toHaveTextContent("Generate them again");
    expect(screen.getByRole("button", { name: "Generate Requirements" })).toBeInTheDocument();
  });

  it("does not warn when the requirements are up to date", async () => {
    await renderPage();
    expect(screen.queryByRole("note", { name: WARNING })).not.toBeInTheDocument();
  });

  it("does not warn when there are no requirements", async () => {
    vi.mocked(getRequirements).mockResolvedValue([]);
    await renderPage();
    expect(screen.queryByRole("note", { name: WARNING })).not.toBeInTheDocument();
  });

  it("does not list the personas when there is only one", async () => {
    await renderPage();
    expect(screen.queryByRole("navigation", { name: "Project personas" })).not.toBeInTheDocument();
  });

  it("blocks deleting the last persona and explains why (AC12.5)", async () => {
    await renderPage();

    const button = screen.getByRole("button", { name: "Delete persona" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("A project must keep at least one persona.");
  });

  describe("with several personas", () => {
    beforeEach(() => {
      vi.mocked(getPersonas).mockResolvedValue([buildPersona(), bruno]);
    });

    it("lists them with name and level, and opens the oldest by default (AC12.3)", async () => {
      await renderPage();

      const nav = screen.getByRole("navigation", { name: "Project personas" });
      expect(nav).toHaveTextContent("Ana · Low");
      expect(nav).toHaveTextContent("Bruno · High");
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ana");
      expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Ana");
    });

    it("shows the persona named in the URL and its requirements (AC12.3 / AC12.4)", async () => {
      await renderPage({ persona: "persona-2" });

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bruno");
      expect(getRequirements).toHaveBeenCalledWith("project-1", "persona-2");
      expect(screen.getByRole("link", { name: "View requirements" })).toHaveAttribute(
        "href",
        "/projects/project-1/requirements?persona=persona-2",
      );
    });

    it("falls back to the oldest when the URL names an unknown persona", async () => {
      await renderPage({ persona: "deleted" });

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ana");
    });

    it("allows deleting a persona (AC12.5)", async () => {
      await renderPage();
      expect(screen.getByRole("button", { name: "Delete persona" })).toBeEnabled();
    });
  });

  it("offers the first generation when the project has no persona (AC4.6)", async () => {
    vi.mocked(getPersonas).mockResolvedValue([]);
    await renderPage();

    expect(screen.getByRole("button", { name: "Generate PATHY Persona" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Generate new persona" })).not.toBeInTheDocument();
  });
});
