import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PathyCodeTooltip } from "./PathyCodeTooltip";

const LABEL = "C1 — Routine tasks using applications";

describe("PathyCodeTooltip", () => {
  it("describes the code with its PATHY catalog label (AC6.7)", () => {
    render(<PathyCodeTooltip code="C1" />);
    expect(screen.getByRole("button", { name: "C1" })).toHaveAccessibleDescription(LABEL);
  });

  it("is hidden until the user hovers the code (AC6.7)", async () => {
    const user = userEvent.setup();
    render(<PathyCodeTooltip code="C1" />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.hover(screen.getByRole("button", { name: "C1" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(LABEL);

    await user.unhover(screen.getByRole("button", { name: "C1" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens on keyboard focus and closes with Escape or blur (AC6.7)", async () => {
    const user = userEvent.setup();
    render(<PathyCodeTooltip code="E2" />);

    await user.tab();
    expect(screen.getByRole("button", { name: "E2" })).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("E2 — ");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab({ shift: true });
    await user.tab();
    expect(screen.getByRole("tooltip")).toBeVisible();
    await user.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
