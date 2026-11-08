import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerationLock } from "@/app/_generation/GenerationLock";
import { createPersona, generateRequirements } from "@/lib/api";
import { GENERATION_ERROR_MESSAGES, GenerationError } from "@/lib/generation";
import { buildPersona } from "@/test/fixtures";
import { GenerateRequirementsButton } from "./GenerateRequirementsButton";
import { NewPersonaButton } from "./NewPersonaButton";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({ createPersona: vi.fn(), generateRequirements: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const openButton = () => screen.getByRole("button", { name: "Generate new persona" });
const submitButton = () => screen.getByRole("button", { name: "Generate persona", hidden: true });

function fill(level: string, name = "", age = "") {
  fireEvent.change(screen.getByLabelText(/Technology experience level/), { target: { value: level } });
  fireEvent.change(screen.getByLabelText(/Name/), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Age/), { target: { value: age } });
}

async function submit() {
  await act(async () => {
    fireEvent.click(submitButton());
  });
}

describe("NewPersonaButton (US12)", () => {
  it("asks only for the level, name and age (AC12.1)", () => {
    render(<NewPersonaButton projectId="project-1" />);
    fireEvent.click(openButton());

    expect(screen.getByRole("dialog", { name: "Generate new persona", hidden: true })).toHaveAttribute("open");
    expect(screen.getByLabelText(/Technology experience level/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Age/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Description/)).not.toBeInTheDocument();
  });

  it("requires the experience level before generating (AC12.1)", async () => {
    render(<NewPersonaButton projectId="project-1" />);
    fireEvent.click(openButton());

    await submit();

    expect(screen.getByText("Select an experience level: low, moderate or high")).toBeInTheDocument();
    expect(createPersona).not.toHaveBeenCalled();
  });

  it("generates with the chosen profile and opens the new persona (AC12.1 / AC12.2)", async () => {
    vi.mocked(createPersona).mockResolvedValue(buildPersona({ id: "persona-9" }));
    render(<NewPersonaButton projectId="project-1" />);
    fireEvent.click(openButton());
    fill("high", "Bruno", "28");

    await submit();

    expect(createPersona).toHaveBeenCalledWith("project-1", {
      techExperienceLevel: "high",
      personaName: "Bruno",
      personaAge: 28,
    });
    expect(push).toHaveBeenCalledWith("/projects/project-1/persona?persona=persona-9");
  });

  it("leaves the name and age out when not provided (AC12.1)", async () => {
    vi.mocked(createPersona).mockResolvedValue(buildPersona());
    render(<NewPersonaButton projectId="project-1" />);
    fireEvent.click(openButton());
    fill("low");

    await submit();

    expect(vi.mocked(createPersona).mock.calls[0]![1]).toMatchObject({
      techExperienceLevel: "low",
      personaName: undefined,
      personaAge: undefined,
    });
  });

  it("retries with the data already submitted (AC11.4)", async () => {
    vi.mocked(createPersona)
      .mockRejectedValueOnce(
        new GenerationError(GENERATION_ERROR_MESSAGES.ai_unavailable, "ai_unavailable"),
      )
      .mockResolvedValueOnce(buildPersona());
    render(<NewPersonaButton projectId="project-1" />);
    fireEvent.click(openButton());
    fill("moderate", "Carla");
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent(GENERATION_ERROR_MESSAGES.ai_unavailable);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    expect(createPersona).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createPersona).mock.calls[1]![1]).toMatchObject({
      techExperienceLevel: "moderate",
      personaName: "Carla",
    });
  });

  it("disables the screen's other generations while it runs (AC11.1)", async () => {
    vi.mocked(createPersona).mockReturnValue(new Promise(() => {}));
    render(
      <GenerationLock>
        <NewPersonaButton projectId="project-1" />
        <GenerateRequirementsButton projectId="project-1" personaId="persona-1" hasRequirements={false} />
      </GenerationLock>,
    );
    expect(screen.getByRole("button", { name: "Generate Requirements" })).toBeEnabled();

    fireEvent.click(openButton());
    fill("low");
    await submit();

    expect(openButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate Requirements" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Generate Requirements" }));
    expect(generateRequirements).not.toHaveBeenCalled();
  });
});
