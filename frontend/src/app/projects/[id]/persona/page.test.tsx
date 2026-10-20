import { render, screen } from "@testing-library/react";
import { PATHY_SECTIONS } from "@smartpathy/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPersona, getProject, getRequirements } from "@/lib/api";
import { buildPersona, buildProject, buildRequirement } from "@/test/fixtures";
import PersonaPage from "./page";

vi.mock("@/lib/api", () => ({
  getProject: vi.fn(),
  getPersona: vi.fn(),
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

async function renderPage() {
  render(await PersonaPage({ params: Promise.resolve({ id: "project-1" }) } as never));
}

const WARNING = "Requirements may be outdated";

describe("PersonaPage", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockResolvedValue(buildProject());
    vi.mocked(getPersona).mockResolvedValue(
      buildPersona({ updatedAt: "2026-10-14T12:00:00.000Z" }),
    );
    vi.mocked(getRequirements).mockResolvedValue([
      buildRequirement({ createdAt: "2026-10-14T13:00:00.000Z" }),
    ]);
  });

  it("offers an Edit button for each of the five sections (AC7.1)", async () => {
    await renderPage();
    for (const { label } of PATHY_SECTIONS) {
      expect(screen.getByRole("button", { name: `Edit ${label}` })).toBeEnabled();
    }
  });

  it("warns when the persona changed after the requirements were generated (AC7.5)", async () => {
    vi.mocked(getPersona).mockResolvedValue(
      buildPersona({ updatedAt: "2026-10-15T09:00:00.000Z" }),
    );
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
});
