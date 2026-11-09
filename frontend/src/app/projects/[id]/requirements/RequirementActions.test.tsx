import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { PATHY_CODES } from "@smartpathy/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteRequirement, updateRequirement } from "@/lib/api";
import { buildRequirement } from "@/test/fixtures";
import { RequirementActions } from "./RequirementActions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api", () => ({ updateRequirement: vi.fn(), deleteRequirement: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const requirement = buildRequirement({
  id: "r1",
  code: "FR3",
  description: "Original text.",
  moscow: "must",
  priority: "high",
  derivedFrom: ["C1", "P1"],
});

function renderActions() {
  render(<RequirementActions requirement={requirement} />);
}

function openEdit() {
  fireEvent.click(screen.getByRole("button", { name: "Edit FR3" }));
  return within(screen.getByRole("dialog", { name: "Edit FR3", hidden: true }));
}

function box(dialog: ReturnType<typeof openEdit>, code: string) {
  return dialog.getByRole("checkbox", { name: new RegExp(`^${code} `), hidden: true });
}

async function save(dialog: ReturnType<typeof openEdit>) {
  await act(async () => {
    fireEvent.click(dialog.getByRole("button", { name: "Save", hidden: true }));
  });
}

describe("RequirementActions: editing", () => {
  it("opens pre-filled, without fields for the code or the type (AC14.1)", () => {
    renderActions();
    const dialog = openEdit();

    expect(dialog.getByLabelText("Description")).toHaveValue("Original text.");
    expect(dialog.getByLabelText("MoSCoW")).toHaveValue("must");
    expect(dialog.getByLabelText("Priority")).toHaveValue("high");
    expect(box(dialog, "C1")).toBeChecked();
    expect(box(dialog, "W1")).not.toBeChecked();
    expect(dialog.queryByLabelText(/code/i)).not.toBeInTheDocument();
    expect(dialog.queryByLabelText(/type/i)).not.toBeInTheDocument();
  });

  it("lists every PATHY code to choose from (AC14.1)", () => {
    renderActions();
    const dialog = openEdit();

    for (const code of PATHY_CODES) {
      expect(box(dialog, code)).toBeInTheDocument();
    }
  });

  it("saves the changes and refreshes the screen (AC14.1)", async () => {
    vi.mocked(updateRequirement).mockResolvedValue({ ok: true, requirement });
    renderActions();
    const dialog = openEdit();

    fireEvent.change(dialog.getByLabelText("Description"), { target: { value: "  New text. " } });
    fireEvent.change(dialog.getByLabelText("MoSCoW"), { target: { value: "wont" } });
    fireEvent.change(dialog.getByLabelText("Priority"), { target: { value: "low" } });
    fireEvent.click(box(dialog, "P1"));
    fireEvent.click(box(dialog, "W1"));
    await save(dialog);

    expect(updateRequirement).toHaveBeenCalledWith("r1", {
      description: "New text.",
      moscow: "wont",
      priority: "low",
      derivedFrom: ["W1", "C1"],
    });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  });

  it("blocks an empty description, with the error on the field (AC14.2)", async () => {
    renderActions();
    const dialog = openEdit();

    fireEvent.change(dialog.getByLabelText("Description"), { target: { value: "   " } });
    await save(dialog);

    expect(dialog.getByText("Description is required")).toBeInTheDocument();
    expect(dialog.getByLabelText("Description")).toHaveAttribute("aria-invalid", "true");
    expect(updateRequirement).not.toHaveBeenCalled();
  });

  it("blocks saving without derived from codes (AC14.2)", async () => {
    renderActions();
    const dialog = openEdit();

    fireEvent.click(box(dialog, "C1"));
    fireEvent.click(box(dialog, "P1"));
    await save(dialog);

    expect(dialog.getByText("Select at least one PATHY code")).toBeInTheDocument();
    expect(updateRequirement).not.toHaveBeenCalled();
  });

  it("shows the field errors returned by the backend (AC14.2)", async () => {
    vi.mocked(updateRequirement).mockResolvedValue({
      ok: false,
      fieldErrors: { description: ["Description is required"] },
    });
    renderActions();
    const dialog = openEdit();

    await save(dialog);

    expect(dialog.getByText("Description is required")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and explains a save failure", async () => {
    vi.mocked(updateRequirement).mockRejectedValue(new Error("Could not save the changes."));
    renderActions();
    const dialog = openEdit();

    await save(dialog);

    expect(dialog.getByRole("alert", { hidden: true })).toHaveTextContent("Could not save");
  });

  it("changes nothing when cancelled", () => {
    renderActions();
    const dialog = openEdit();

    fireEvent.click(dialog.getByRole("button", { name: "Cancel", hidden: true }));

    expect(updateRequirement).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  });
});

describe("RequirementActions: deleting (AC14.3)", () => {
  function openDelete() {
    fireEvent.click(screen.getByRole("button", { name: "Delete FR3" }));
    return within(screen.getByRole("dialog", { name: "Delete FR3?", hidden: true }));
  }

  it("asks for confirmation before deleting", () => {
    renderActions();
    openDelete();

    expect(deleteRequirement).not.toHaveBeenCalled();
  });

  it("deletes after confirmation and refreshes the counts", async () => {
    vi.mocked(deleteRequirement).mockResolvedValue();
    renderActions();
    const dialog = openDelete();

    await act(async () => {
      fireEvent.click(dialog.getByRole("button", { name: "Delete requirement", hidden: true }));
    });

    expect(deleteRequirement).toHaveBeenCalledWith("r1");
    expect(refresh).toHaveBeenCalled();
  });

  it("changes nothing when cancelled", () => {
    renderActions();
    const dialog = openDelete();

    fireEvent.click(dialog.getByRole("button", { name: "Cancel", hidden: true }));

    expect(deleteRequirement).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  });

  it("shows the error when the deletion fails", async () => {
    vi.mocked(deleteRequirement).mockRejectedValue(new Error("Could not delete the requirement."));
    renderActions();
    const dialog = openDelete();

    await act(async () => {
      fireEvent.click(dialog.getByRole("button", { name: "Delete requirement", hidden: true }));
    });

    expect(dialog.getByRole("alert", { hidden: true })).toHaveTextContent("Could not delete");
    expect(refresh).not.toHaveBeenCalled();
  });
});
