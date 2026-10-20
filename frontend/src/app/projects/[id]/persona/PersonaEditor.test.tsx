import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updatePersona } from "@/lib/api";
import { buildPersona } from "@/test/fixtures";
import { PersonaEditor } from "./PersonaEditor";

vi.mock("@/lib/api", () => ({ updatePersona: vi.fn() }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function section(name: string) {
  return screen.getByRole("region", { name });
}

function renderEditor(hasRequirements = false) {
  const user = userEvent.setup();
  render(<PersonaEditor persona={buildPersona()} hasRequirements={hasRequirements} />);
  return user;
}

describe("PersonaEditor", () => {
  beforeEach(() => {
    vi.mocked(updatePersona).mockReset();
    refresh.mockReset();
  });

  it("makes only the chosen section editable, pre-filled with the current values (AC7.1)", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Edit Who" }));

    const who = section("Who");
    expect(within(who).getByRole("textbox", { name: "W1 Profession" })).toHaveValue("Nurse");
    expect(within(who).getByRole("textbox", { name: "W1 Profession" })).toHaveFocus();
    expect(within(who).getAllByRole("textbox")).toHaveLength(4);
    expect(within(section("Context")).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Context" })).toBeDisabled();
  });

  it("blocks saving with an empty field and points to it (AC7.2)", async () => {
    const user = renderEditor();
    await user.click(screen.getByRole("button", { name: "Edit Who" }));
    const profession = screen.getByRole("textbox", { name: "W1 Profession" });

    await user.clear(profession);
    await user.type(profession, "   ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updatePersona).not.toHaveBeenCalled();
    expect(profession).toHaveAttribute("aria-invalid", "true");
    expect(profession).toHaveAccessibleDescription("This field is required.");
    expect(profession).toHaveFocus();
  });

  it("shows the field errors returned by the backend (AC7.2)", async () => {
    vi.mocked(updatePersona).mockResolvedValue({
      ok: false,
      fieldErrors: { "context.routineTasks": ["This field is required."] },
    });
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Edit Context" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const routineTasks = screen.getByRole("textbox", { name: "C1 Routine tasks using applications" });
    expect(routineTasks).toHaveAccessibleDescription("This field is required.");
  });

  it("saves, returns to read-only with the new values and confirms (AC7.3)", async () => {
    vi.mocked(updatePersona).mockImplementation(async (_id, sections) => ({
      ok: true,
      persona: { ...buildPersona(), ...sections },
    }));
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Edit Who" }));
    const profession = screen.getByRole("textbox", { name: "W1 Profession" });
    await user.clear(profession);
    await user.type(profession, "  Head nurse ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [projectId, sections] = vi.mocked(updatePersona).mock.calls[0]!;
    expect(projectId).toBe("project-1");
    expect(sections.who.profession).toBe("Head nurse");
    expect(sections.problems).toEqual(buildPersona().problems);

    const who = section("Who");
    expect(within(who).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(who).getByText("Head nurse")).toBeInTheDocument();
    expect(within(who).getByRole("status")).toHaveTextContent("Changes saved.");
    expect(screen.getByRole("button", { name: "Edit Who" })).toHaveFocus();
    expect(refresh).toHaveBeenCalled();
  });

  it("mentions the outdated requirements when saving with requirements (AC7.5)", async () => {
    vi.mocked(updatePersona).mockResolvedValue({ ok: true, persona: buildPersona() });
    const user = renderEditor(true);

    await user.click(screen.getByRole("button", { name: "Edit Problems" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "generated from the previous version of this persona",
    );
  });

  it("discards the changes on cancel (AC7.4)", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Edit Who" }));
    const profession = screen.getByRole("textbox", { name: "W1 Profession" });
    await user.clear(profession);
    await user.type(profession, "Doctor");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updatePersona).not.toHaveBeenCalled();
    expect(within(section("Who")).getByText("Nurse")).toBeInTheDocument();
    expect(screen.queryByText("Doctor")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Context" })).toBeEnabled();

    // Editing again starts from the saved values, not the discarded draft.
    await user.click(screen.getByRole("button", { name: "Edit Who" }));
    expect(screen.getByRole("textbox", { name: "W1 Profession" })).toHaveValue("Nurse");
  });

  it("keeps the section open with an error when saving fails", async () => {
    vi.mocked(updatePersona).mockRejectedValue(new Error("Could not save the changes."));
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Edit Who" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Could not save the changes.");
    expect(screen.getByRole("textbox", { name: "W1 Profession" })).toBeInTheDocument();
  });
});
