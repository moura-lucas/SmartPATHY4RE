import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPersonas, getProject } from "@/lib/api";
import { buildPersona, buildProject } from "@/test/fixtures";
import ProjectPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getProject: vi.fn(),
  getPersonas: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn() }),
}));

async function renderPage() {
  render(await ProjectPage({ params: Promise.resolve({ id: "project-1" }) } as never));
}

describe("ProjectPage export", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockResolvedValue(buildProject());
    vi.mocked(getPersonas).mockResolvedValue([buildPersona()]);
  });

  it("links to the export screen when the project has a persona (AC15.1)", async () => {
    await renderPage();

    expect(getPersonas).toHaveBeenCalledWith("project-1");
    expect(screen.getByRole("link", { name: "Export" })).toHaveAttribute(
      "href",
      "/projects/project-1/export",
    );
  });

  it("disables the export when the project has no persona (AC9.5 / AC10.5)", async () => {
    vi.mocked(getPersonas).mockResolvedValue([]);
    await renderPage();

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("links to the personas instead of generating another one from here", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "View personas" })).toHaveAttribute(
      "href",
      "/projects/project-1/persona",
    );
    expect(screen.queryByRole("button", { name: "Generate PATHY Persona" })).not.toBeInTheDocument();
  });

  it("offers the generation while the project has no persona (AC2.7)", async () => {
    vi.mocked(getPersonas).mockResolvedValue([]);
    await renderPage();

    expect(screen.getByRole("button", { name: "Generate PATHY Persona" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "View personas" })).not.toBeInTheDocument();
  });
});
