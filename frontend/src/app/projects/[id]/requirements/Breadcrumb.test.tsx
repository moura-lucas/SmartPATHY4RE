import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("links every ancestor and marks the current page (AC6.9)", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Projects", href: "/" },
          { label: "CareTrack", href: "/projects/1" },
          { label: "Persona", href: "/projects/1/persona" },
          { label: "Requirements" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Projects",
      "›CareTrack",
      "›Persona",
      "›Requirements",
    ]);
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Persona" })).toHaveAttribute(
      "href",
      "/projects/1/persona",
    );
    expect(within(nav).queryByRole("link", { name: "Requirements" })).not.toBeInTheDocument();
    expect(within(nav).getByText("Requirements")).toHaveAttribute("aria-current", "page");
  });
});
