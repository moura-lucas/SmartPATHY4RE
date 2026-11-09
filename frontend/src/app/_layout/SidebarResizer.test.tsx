import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarResizer } from "./SidebarResizer";

const width = () => document.documentElement.style.getPropertyValue("--sidebar-width");
const handle = () => screen.getByRole("separator", { name: "Resize sidebar" });

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  document.documentElement.style.removeProperty("--sidebar-width");
  localStorage.clear();
});

describe("SidebarResizer", () => {
  it("follows the pointer while dragging and saves the width on release", () => {
    render(<SidebarResizer />);

    fireEvent.pointerDown(handle(), { pointerId: 1 });
    fireEvent(handle(), new MouseEvent("pointermove", { bubbles: true, clientX: 320 }));
    expect(width()).toBe("320px");
    expect(localStorage.getItem("sidebar-width")).toBeNull();

    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(localStorage.getItem("sidebar-width")).toBe("320");
    expect(handle()).toHaveAttribute("aria-valuenow", "320");
  });

  it("ignores pointer movement when not dragging", () => {
    render(<SidebarResizer />);

    fireEvent(handle(), new MouseEvent("pointermove", { bubbles: true, clientX: 320 }));

    expect(width()).toBe("");
  });

  it("stays within the limits", () => {
    render(<SidebarResizer />);

    fireEvent.pointerDown(handle(), { pointerId: 1 });
    fireEvent(handle(), new MouseEvent("pointermove", { bubbles: true, clientX: 2000 }));
    expect(width()).toBe("420px");

    fireEvent(handle(), new MouseEvent("pointermove", { bubbles: true, clientX: 10 }));
    expect(width()).toBe("200px");
  });

  it("can be resized with the keyboard", () => {
    render(<SidebarResizer />);

    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(width()).toBe("256px");
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(width()).toBe("224px");
    fireEvent.keyDown(handle(), { key: "End" });
    expect(width()).toBe("420px");
    expect(localStorage.getItem("sidebar-width")).toBe("420");
  });

  it("returns to the default width on double-click", () => {
    render(<SidebarResizer />);
    fireEvent.keyDown(handle(), { key: "End" });

    fireEvent.doubleClick(handle());

    expect(width()).toBe("240px");
  });
});
