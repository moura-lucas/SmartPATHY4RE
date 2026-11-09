import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportActions } from "./ExportActions";

describe("ExportActions", () => {
  it("links to the export screen when there is a persona (AC15.1)", () => {
    render(<ExportActions projectId="project-1" hasPersona />);

    expect(screen.getByRole("link", { name: "Export" })).toHaveAttribute(
      "href",
      "/projects/project-1/export",
    );
  });

  it("is disabled and explains why without a persona (AC9.5 / AC10.5)", () => {
    render(<ExportActions projectId="project-1" hasPersona={false} />);

    const button = screen.getByRole("button", { name: "Export" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Generate the persona first to export it.");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
