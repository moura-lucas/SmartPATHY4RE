import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRequirements } from "@/lib/api";
import { GENERATION_ERROR_MESSAGES, GenerationError } from "@/lib/generation";
import { GenerateRequirementsButton } from "./GenerateRequirementsButton";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({ generateRequirements: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const generateButton = () => screen.getByRole("button", { name: /Generat/ });

describe("GenerateRequirementsButton (US11)", () => {
  it("shows the requirements step while generating (AC11.1)", () => {
    vi.mocked(generateRequirements).mockReturnValue(new Promise(() => {}));
    render(<GenerateRequirementsButton projectId="project-1" hasRequirements={false} />);

    fireEvent.click(generateButton());

    expect(screen.getByText("Generating requirements from the persona…")).toBeInTheDocument();
    expect(generateButton()).toBeDisabled();
  });

  it("retries without asking to replace the requirements again (AC11.4)", async () => {
    vi.mocked(generateRequirements)
      .mockRejectedValueOnce(
        new GenerationError(GENERATION_ERROR_MESSAGES.ai_invalid_response, "ai_invalid_response"),
      )
      .mockResolvedValueOnce([]);
    render(<GenerateRequirementsButton projectId="project-1" hasRequirements />);

    fireEvent.click(generateButton());
    const replaceDialog = screen.getByRole("dialog", { name: "Replace current requirements?", hidden: true });
    expect(replaceDialog).toHaveAttribute("open");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Replace requirements", hidden: true }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      GENERATION_ERROR_MESSAGES.ai_invalid_response,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    expect(replaceDialog).not.toHaveAttribute("open");
    expect(generateRequirements).toHaveBeenCalledTimes(2);
    expect(generateRequirements).toHaveBeenLastCalledWith("project-1");
    expect(push).toHaveBeenCalledWith("/projects/project-1/requirements");
  });
});
