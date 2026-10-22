import { render, screen } from "@testing-library/react";
import { PROJECT_STAGES } from "@smartpathy/shared";
import { describe, expect, it } from "vitest";
import { StageBadge } from "./StageBadge";

describe("StageBadge", () => {
  it.each([
    ["created", "Created"],
    ["persona_generated", "Persona generated"],
    ["requirements_generated", "Requirements generated"],
  ] as const)("shows the %s stage as text (AC8.1)", (stage, label) => {
    render(<StageBadge stage={stage} />);
    expect(screen.getByText(label)).toBeVisible();
  });

  it("gives each stage its own color", () => {
    const classes = PROJECT_STAGES.map(
      (stage) => render(<StageBadge stage={stage} />).container.firstElementChild!.className,
    );
    expect(new Set(classes).size).toBe(PROJECT_STAGES.length);
  });
});
