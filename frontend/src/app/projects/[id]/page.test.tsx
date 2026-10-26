import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPersona, getProject } from "@/lib/api";
import { buildPersona, buildProject } from "@/test/fixtures";
import ProjectPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getProject: vi.fn(),
  getPersona: vi.fn(),
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
    vi.mocked(getPersona).mockResolvedValue(buildPersona());
  });

  it("offers the exports when the project has a persona (AC9.1 / AC10.1)", async () => {
    await renderPage();

    expect(getPersona).toHaveBeenCalledWith("project-1");
    expect(screen.getByRole("link", { name: "Export JSON" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export PDF" })).toBeInTheDocument();
  });

  it("disables the exports when the project has no persona (AC9.5 / AC10.5)", async () => {
    vi.mocked(getPersona).mockResolvedValue(null);
    await renderPage();

    expect(screen.getByRole("button", { name: "Export JSON" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  });
});
