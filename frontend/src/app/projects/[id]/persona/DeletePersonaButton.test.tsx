import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deletePersona } from "@/lib/api";
import { DeletePersonaButton } from "./DeletePersonaButton";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/lib/api", () => ({ deletePersona: vi.fn() }));

afterEach(() => vi.clearAllMocks());

function renderButton(isLast = false) {
  render(
    <DeletePersonaButton
      projectId="project-1"
      personaId="persona-2"
      personaName="Bruno"
      isLast={isLast}
    />,
  );
}

const button = () => screen.getByRole("button", { name: "Delete persona" });

async function confirmDeletion() {
  fireEvent.click(button());
  const [, inDialog] = screen.getAllByRole("button", { name: "Delete persona", hidden: true });
  await act(async () => {
    fireEvent.click(inDialog!);
  });
}

describe("DeletePersonaButton (AC12.5)", () => {
  it("asks for confirmation, without deleting yet", () => {
    renderButton();

    fireEvent.click(button());

    const dialog = screen.getByRole("dialog", { name: "Delete Bruno?", hidden: true });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent("requirements generated from it");
    expect(deletePersona).not.toHaveBeenCalled();
  });

  it("does nothing when cancelled", () => {
    renderButton();

    fireEvent.click(button());
    fireEvent.click(screen.getByRole("button", { name: "Cancel", hidden: true }));

    expect(deletePersona).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

  it("deletes after confirmation and goes back to the remaining personas", async () => {
    vi.mocked(deletePersona).mockResolvedValue();
    renderButton();

    await confirmDeletion();

    expect(deletePersona).toHaveBeenCalledWith("project-1", "persona-2");
    expect(replace).toHaveBeenCalledWith("/projects/project-1/persona");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the error and allows trying again", async () => {
    vi.mocked(deletePersona).mockRejectedValue(new Error("A project must keep at least one persona."));
    renderButton();

    await confirmDeletion();

    expect(screen.getByRole("alert")).toHaveTextContent("at least one persona");
    expect(replace).not.toHaveBeenCalled();
    expect(button()).toBeEnabled();
  });

  it("blocks the last persona and explains why", () => {
    renderButton(true);

    expect(button()).toBeDisabled();
    expect(button()).toHaveAccessibleDescription("A project must keep at least one persona.");
  });
});
