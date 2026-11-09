import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportForm, type ExportablePersona } from "./ExportForm";

const ana: ExportablePersona = {
  id: "persona-1",
  name: "Ana",
  techExperienceLevel: "low",
  functionalCount: 10,
  nonFunctionalCount: 6,
};
const bruno: ExportablePersona = {
  id: "persona-2",
  name: "Bruno",
  techExperienceLevel: "high",
  functionalCount: 5,
  nonFunctionalCount: 3,
};

function renderForm(personas = [ana, bruno]) {
  render(<ExportForm projectId="project-1" personas={personas} />);
}

const toggle = (name: string | RegExp) => fireEvent.click(screen.getByRole("checkbox", { name }));

function summary() {
  const section = screen.getByRole("region", { name: "Summary" });
  return Object.fromEntries(
    within(section)
      .getAllByRole("term")
      .map((term) => [term.textContent, Number(term.nextElementSibling?.textContent)]),
  );
}

function href() {
  return new URL(
    screen.getByRole("link", { name: "Export" }).getAttribute("href")!,
    "http://localhost",
  );
}

describe("ExportForm", () => {
  it("offers the available formats (AC15.1)", () => {
    renderForm();
    expect(screen.getByRole("radio", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "PDF" })).toBeChecked();
  });

  it("selects everything by default (AC15.2)", () => {
    renderForm();
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeChecked();
    expect(summary()).toEqual({
      "PATHY personas": 2,
      "Functional requirements": 15,
      "Non-functional requirements": 9,
      Total: 26,
    });
  });

  it("does not ask which persona when there is only one (AC15.2)", () => {
    renderForm([ana]);
    expect(screen.queryByRole("checkbox", { name: /Ana/ })).not.toBeInTheDocument();
    expect(href().searchParams.get("personas")).toBe("persona-1");
  });

  it("updates the summary as the selection changes (AC15.3)", () => {
    renderForm();

    toggle("PATHY persona");
    expect(summary()).toMatchObject({ "PATHY personas": 0, Total: 24 });

    toggle(/Bruno/);
    expect(summary()).toEqual({
      "PATHY personas": 0,
      "Functional requirements": 10,
      "Non-functional requirements": 6,
      Total: 16,
    });

    toggle("Non-functional requirements");
    expect(summary()).toMatchObject({ "Non-functional requirements": 0, Total: 10 });
  });

  it("requests only what is selected, in the chosen format (AC15.5)", () => {
    renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "JSON" }));
    toggle(/Ana/);
    toggle("PATHY persona");

    const url = href();
    expect(url.pathname).toBe("/projects/project-1/export");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("personas")).toBe("persona-2");
    expect(url.searchParams.get("include")).toBe("functional,non_functional");
  });

  it("blocks the export without any content, explaining why (AC15.4)", () => {
    renderForm();

    toggle("PATHY persona");
    toggle("Functional requirements");
    toggle("Non-functional requirements");

    const button = screen.getByRole("button", { name: "Export" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Select at least one persona and one type of content to export.",
    );
    expect(screen.queryByRole("link", { name: "Export" })).not.toBeInTheDocument();
  });

  it("blocks the export without any persona (AC15.4)", () => {
    renderForm();

    toggle(/Ana/);
    toggle(/Bruno/);

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("blocks a selection that has no items, explaining why (AC15.4)", () => {
    renderForm([{ ...ana, functionalCount: 0, nonFunctionalCount: 0 }]);

    toggle("PATHY persona");

    expect(screen.getByRole("button", { name: "Export" })).toHaveAccessibleDescription(
      "The selected content has no items to export.",
    );
  });

  it("enables the export again when something is selected", () => {
    renderForm();

    toggle("PATHY persona");
    toggle("Functional requirements");
    toggle("Non-functional requirements");
    toggle("Functional requirements");

    expect(screen.getByRole("link", { name: "Export" })).toBeInTheDocument();
  });
});
