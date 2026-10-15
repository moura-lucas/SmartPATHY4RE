import { render, screen } from "@testing-library/react";
import { PRIORITIES } from "@smartpathy/shared";
import { describe, expect, it } from "vitest";
import { PriorityBadge } from "./PriorityBadge";

describe("PriorityBadge", () => {
  it.each([
    ["high", "High"],
    ["medium", "Medium"],
    ["low", "Low"],
  ] as const)("shows the %s priority as text, not only as color (AC6.6)", (priority, label) => {
    render(<PriorityBadge priority={priority} />);
    expect(screen.getByText(label)).toBeVisible();
  });

  it("gives each priority its own color and symbol (AC6.6)", () => {
    const badges = PRIORITIES.map((priority) => {
      const { container } = render(<PriorityBadge priority={priority} />);
      const badge = container.firstElementChild!;
      return { className: badge.className, symbol: badge.firstElementChild!.textContent };
    });

    expect(new Set(badges.map((b) => b.className)).size).toBe(PRIORITIES.length);
    expect(new Set(badges.map((b) => b.symbol)).size).toBe(PRIORITIES.length);
  });
});
