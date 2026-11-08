import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateMoreRequirements } from "@/lib/api";
import { GENERATION_ERROR_MESSAGES, GenerationError } from "@/lib/generation";
import { GenerateMoreRequirementsButton } from "./GenerateMoreRequirementsButton";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/lib/api", () => ({ generateMoreRequirements: vi.fn() }));

afterEach(() => vi.clearAllMocks());

function renderButton(requirementsCount = 16) {
  render(
    <GenerateMoreRequirementsButton
      projectId="project-1"
      personaId="persona-2"
      requirementsCount={requirementsCount}
    />,
  );
}

const button = () => screen.getByRole("button", { name: /Generat/ });

describe("GenerateMoreRequirementsButton (US13)", () => {
  it("generates for the selected persona and refreshes the screen (AC13.1 / AC13.5)", async () => {
    vi.mocked(generateMoreRequirements).mockResolvedValue([]);
    renderButton();

    await act(async () => {
      fireEvent.click(button());
    });

    expect(generateMoreRequirements).toHaveBeenCalledWith("project-1", "persona-2");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the step and blocks new requests while generating (AC11.1)", () => {
    vi.mocked(generateMoreRequirements).mockReturnValue(new Promise(() => {}));
    renderButton();

    fireEvent.click(button());

    expect(screen.getByText("Generating additional requirements…")).toBeInTheDocument();
    expect(button()).toBeDisabled();
  });

  it("shows the failure with Retry and does not refresh (AC13.4)", async () => {
    vi.mocked(generateMoreRequirements).mockRejectedValue(
      new GenerationError(GENERATION_ERROR_MESSAGES.ai_invalid_response, "ai_invalid_response"),
    );
    renderButton();

    await act(async () => {
      fireEvent.click(button());
    });

    expect(screen.getByRole("alert")).toHaveTextContent(GENERATION_ERROR_MESSAGES.ai_invalid_response);
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("allows the last batch that fits in the limit", () => {
    renderButton(32);
    expect(button()).toBeEnabled();
  });

  it("is disabled, with an explanation, when there is no room for another batch", () => {
    renderButton(33);

    expect(button()).toBeDisabled();
    expect(button()).toHaveAccessibleDescription("A persona can have at most 40 requirements.");
  });
});
