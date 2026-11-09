import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPersonas, getProject, getRequirements } from "@/lib/api";
import { buildPersona, buildProject, buildRequirement } from "@/test/fixtures";
import ExportPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getProject: vi.fn(),
  getPersonas: vi.fn(),
  getRequirements: vi.fn(),
}));

const notFoundError = new Error("NEXT_NOT_FOUND");
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw notFoundError;
  },
}));

async function renderPage() {
  render(await ExportPage({ params: Promise.resolve({ id: "project-1" }) } as never));
}

describe("ExportPage", () => {
  beforeEach(() => {
    vi.mocked(getProject).mockResolvedValue(buildProject());
    vi.mocked(getPersonas).mockResolvedValue([buildPersona()]);
    vi.mocked(getRequirements).mockResolvedValue([
      buildRequirement({ code: "FR1" }),
      buildRequirement({ code: "NFR1" }),
    ]);
  });

  it("shows the export options and the requirement counts (AC15.1)", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Export");
    expect(screen.getByRole("radio", { name: "PDF" })).toBeInTheDocument();
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("3");
  });

  it("does not offer the export without a persona", async () => {
    vi.mocked(getPersonas).mockResolvedValue([]);
    await renderPage();

    expect(screen.getByText("Generate the persona first to export it.")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("is not found when the project does not exist", async () => {
    vi.mocked(getProject).mockResolvedValue(null);
    await expect(renderPage()).rejects.toBe(notFoundError);
  });
});
