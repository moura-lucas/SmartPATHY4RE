import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportActions } from "./ExportActions";

describe("ExportActions", () => {
  it("links to the JSON and PDF downloads when there is a persona (AC9.1 / AC10.1)", () => {
    render(<ExportActions projectId="project-1" hasPersona />);

    expect(screen.getByRole("link", { name: "Export JSON" })).toHaveAttribute(
      "href",
      "http://localhost:4000/projects/project-1/export?format=json",
    );
    expect(screen.getByRole("link", { name: "Export PDF" })).toHaveAttribute(
      "href",
      "http://localhost:4000/projects/project-1/export?format=pdf",
    );
  });

  it("disables both options and explains why without a persona (AC9.5 / AC10.5)", () => {
    render(<ExportActions projectId="project-1" hasPersona={false} />);

    for (const name of ["Export JSON", "Export PDF"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription("Generate the persona first to export it.");
    }
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
