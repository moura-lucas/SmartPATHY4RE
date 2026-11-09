import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteProject, updateProject } from "@/lib/api";
import { buildProject } from "@/test/fixtures";
import { ProjectActions } from "./ProjectActions";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/lib/api", () => ({ updateProject: vi.fn(), deleteProject: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const project = buildProject({ additionalContext: "Night shifts." });

function renderActions(personaCount = 2, requirementCount = 16) {
  render(
    <ProjectActions
      project={project}
      personaCount={personaCount}
      requirementCount={requirementCount}
    />,
  );
}

function openEdit() {
  fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
  return within(screen.getByRole("dialog", { name: "Edit project", hidden: true }));
}

const WARNING = /generated from the previous context/;

async function save(dialog: ReturnType<typeof openEdit>) {
  await act(async () => {
    fireEvent.click(dialog.getByRole("button", { name: "Save", hidden: true }));
  });
}

function saved() {
  vi.mocked(updateProject).mockResolvedValue({ ok: true, project });
}

describe("ProjectActions: editing (AC17.1)", () => {
  it("opens pre-filled, without the persona data", () => {
    renderActions();
    const dialog = openEdit();

    expect(dialog.getByLabelText(/Project name/)).toHaveValue(project.name);
    expect(dialog.getByLabelText(/Application domain/)).toHaveValue(project.domain);
    expect(dialog.getByLabelText(/Description/)).toHaveValue(project.description);
    expect(dialog.getByLabelText(/Additional context/)).toHaveValue("Night shifts.");
    expect(dialog.queryByLabelText(/Persona/)).not.toBeInTheDocument();
    expect(dialog.queryByLabelText(/experience/i)).not.toBeInTheDocument();
  });

  it("saves the changes and refreshes the page", async () => {
    saved();
    renderActions();
    const dialog = openEdit();

    fireEvent.change(dialog.getByLabelText(/Project name/), { target: { value: "  New name " } });
    await save(dialog);

    expect(updateProject).toHaveBeenCalledWith(project.id, {
      name: "New name",
      domain: project.domain,
      description: project.description,
      additionalContext: "Night shifts.",
    });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  });

  it("blocks invalid data with the US2 messages", async () => {
    renderActions();
    const dialog = openEdit();

    fireEvent.change(dialog.getByLabelText(/Project name/), { target: { value: "  " } });
    await save(dialog);

    expect(dialog.getByText("Project name is required")).toBeInTheDocument();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("shows the field errors returned by the backend", async () => {
    vi.mocked(updateProject).mockResolvedValue({
      ok: false,
      fieldErrors: { domain: ["Application domain is required"] },
    });
    renderActions();
    const dialog = openEdit();

    await save(dialog);

    expect(dialog.getByText("Application domain is required")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and explains a save failure", async () => {
    vi.mocked(updateProject).mockRejectedValue(new Error("Could not save the changes."));
    renderActions();
    const dialog = openEdit();

    await save(dialog);

    expect(dialog.getByRole("alert", { hidden: true })).toHaveTextContent("Could not save");
  });

  it("changes nothing when cancelled", () => {
    renderActions();
    const dialog = openEdit();

    fireEvent.click(dialog.getByRole("button", { name: "Cancel", hidden: true }));

    expect(updateProject).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  });
});

describe("ProjectActions: outdated artifacts warning (AC17.2)", () => {
  async function changeAndSave(field: RegExp, value: string) {
    saved();
    const dialog = openEdit();
    fireEvent.change(dialog.getByLabelText(field), { target: { value } });
    await save(dialog);
  }

  it.each([
    [/Project name/, "New name"],
    [/Application domain/, "Education"],
    [/Description/, "Another description."],
    [/Additional context/, ""],
  ])("warns when %s changes and there are artifacts", async (field, value) => {
    renderActions();

    await changeAndSave(field, value);

    expect(screen.getByRole("status")).toHaveTextContent(WARNING);
  });

  it("does not warn when the project has no artifacts", async () => {
    renderActions(0, 0);

    await changeAndSave(/Project name/, "New name");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not warn when nothing changed", async () => {
    saved();
    renderActions();

    await save(openEdit());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clears the warning when editing again", async () => {
    renderActions();
    await changeAndSave(/Project name/, "New name");

    openEdit();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ProjectActions: deleting (AC17.3 / AC17.4)", () => {
  function openDelete() {
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    return within(screen.getByRole("dialog", { name: `Delete ${project.name}?`, hidden: true }));
  }

  const confirm = (dialog: ReturnType<typeof openDelete>) =>
    act(async () => {
      fireEvent.click(dialog.getByRole("button", { name: "Delete project", hidden: true }));
    });

  it("says how many personas and requirements will be removed", () => {
    renderActions();

    expect(
      screen.queryByText(/2 personas/),
    ).not.toBeInTheDocument();
    expect(openDelete().getByText(/along with 2 personas and 16 requirements/)).toBeInTheDocument();
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it("uses the singular for one item", () => {
    renderActions(1, 1);

    expect(openDelete().getByText(/along with 1 persona and 1 requirement\./)).toBeInTheDocument();
  });

  it("deletes after confirmation and goes back to the dashboard", async () => {
    vi.mocked(deleteProject).mockResolvedValue();
    renderActions();

    await confirm(openDelete());

    expect(deleteProject).toHaveBeenCalledWith(project.id);
    expect(replace).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });

  it("changes nothing when cancelled", () => {
    renderActions();
    const dialog = openDelete();

    fireEvent.click(dialog.getByRole("button", { name: "Cancel", hidden: true }));

    expect(deleteProject).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
  });

  it("shows the error and stays on the page when the deletion fails", async () => {
    vi.mocked(deleteProject).mockRejectedValue(new Error("Could not delete the project."));
    renderActions();
    const dialog = openDelete();

    await confirm(dialog);

    expect(dialog.getByRole("alert", { hidden: true })).toHaveTextContent("Could not delete");
    expect(replace).not.toHaveBeenCalled();
  });
});
