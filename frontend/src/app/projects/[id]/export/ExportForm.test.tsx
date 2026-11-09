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
  const section = screen.getByRole("region", { name: "3. Export Summary" });
  return Object.fromEntries(
    within(section)
      .getAllByRole("term")
      .map((term) => [term.textContent, parseInt(term.nextElementSibling?.textContent ?? "", 10)]),
  );
}

function href() {
  return new URL(
    screen.getByRole("link", { name: "Export Requirements" }).getAttribute("href")!,
    "http://localhost",
  );
}

describe("ExportForm", () => {
  it("keeps the content selection when using the new formats (AC16.1)", () => {
    renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Export as XLSX" }));
    toggle("Include PATHY Persona");

    const url = href();
    expect(url.searchParams.get("format")).toBe("xlsx");
    expect(url.searchParams.get("include")).toBe("functional,non_functional");
    expect(summary()).toMatchObject({ "Total Items": 24 });
  });

  it("offers the available formats (AC15.1 / AC16.1)", () => {
    renderForm();
    expect(screen.getByRole("radio", { name: "Export as JSON" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Export as PDF" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Export as DOCX" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Export as XLSX" })).toBeInTheDocument();
  });

  it("selects everything by default (AC15.2)", () => {
    renderForm();
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeChecked();
    expect(summary()).toEqual({
      "PATHY Persona": 2,
      "Functional Requirements": 15,
      "Non-functional Requirements": 9,
      "Total Items": 26,
    });
  });

  it("describes each format and shows the counts with their units", () => {
    renderForm([ana]);

    expect(screen.getByRole("radio", { name: "Export as DOCX" })).toHaveAccessibleDescription(
      "Export requirements in Microsoft Word format.",
    );
    const region = within(screen.getByRole("region", { name: "3. Export Summary" }));
    expect(region.getByText("1 persona")).toBeInTheDocument();
    expect(region.getByText("10 requirements")).toBeInTheDocument();
    expect(region.getByText("17 items")).toBeInTheDocument();
  });

  it("does not ask which persona when there is only one (AC15.2)", () => {
    renderForm([ana]);
    expect(screen.queryByRole("checkbox", { name: /Ana/ })).not.toBeInTheDocument();
    expect(href().searchParams.get("personas")).toBe("persona-1");
  });

  it("updates the summary as the selection changes (AC15.3)", () => {
    renderForm();

    toggle("Include PATHY Persona");
    expect(summary()).toMatchObject({ "PATHY Persona": 0, "Total Items": 24 });

    toggle(/Bruno/);
    expect(summary()).toEqual({
      "PATHY Persona": 0,
      "Functional Requirements": 10,
      "Non-functional Requirements": 6,
      "Total Items": 16,
    });

    toggle("Include Non-functional Requirements");
    expect(summary()).toMatchObject({ "Non-functional Requirements": 0, "Total Items": 10 });
  });

  it("requests only what is selected, in the chosen format (AC15.5)", () => {
    renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Export as JSON" }));
    toggle(/Ana/);
    toggle("Include PATHY Persona");

    const url = href();
    expect(url.pathname).toBe("/projects/project-1/export");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("personas")).toBe("persona-2");
    expect(url.searchParams.get("include")).toBe("functional,non_functional");
  });

  it("blocks the export without any content, explaining why (AC15.4)", () => {
    renderForm();

    toggle("Include PATHY Persona");
    toggle("Include Functional Requirements");
    toggle("Include Non-functional Requirements");

    const button = screen.getByRole("button", { name: "Export Requirements" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Select at least one persona and one type of content to export.",
    );
    expect(screen.queryByRole("link", { name: "Export Requirements" })).not.toBeInTheDocument();
  });

  it("blocks the export without any persona (AC15.4)", () => {
    renderForm();

    toggle(/Ana/);
    toggle(/Bruno/);

    expect(screen.getByRole("button", { name: "Export Requirements" })).toBeDisabled();
  });

  it("blocks a selection that has no items, explaining why (AC15.4)", () => {
    renderForm([{ ...ana, functionalCount: 0, nonFunctionalCount: 0 }]);

    toggle("Include PATHY Persona");

    expect(screen.getByRole("button", { name: "Export Requirements" })).toHaveAccessibleDescription(
      "The selected content has no items to export.",
    );
  });

  it("enables the export again when something is selected", () => {
    renderForm();

    toggle("Include PATHY Persona");
    toggle("Include Functional Requirements");
    toggle("Include Non-functional Requirements");
    toggle("Include Functional Requirements");

    expect(screen.getByRole("link", { name: "Export Requirements" })).toBeInTheDocument();
  });
});
