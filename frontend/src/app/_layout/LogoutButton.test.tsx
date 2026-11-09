import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logout } from "@/lib/api";
import { LogoutButton } from "./LogoutButton";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/lib/api", () => ({ logout: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe("LogoutButton (AC18.5)", () => {
  it("ends the session and goes to the login screen", async () => {
    vi.mocked(logout).mockResolvedValue();
    render(<LogoutButton />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalled();
  });
});
