import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { login } from "@/lib/api";
import LoginPage from "./page";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/lib/api", () => ({ login: vi.fn() }));

afterEach(() => vi.clearAllMocks());

async function submit(email = "ana@example.com", password = "correct-horse") {
  render(<LoginPage />);
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: password } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
  });
}

describe("LoginPage (AC18.2)", () => {
  it("goes to the dashboard after logging in", async () => {
    vi.mocked(login).mockResolvedValue(true);

    await submit();

    expect(login).toHaveBeenCalledWith({ email: "ana@example.com", password: "correct-horse" });
    expect(replace).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a generic message for wrong credentials", async () => {
    vi.mocked(login).mockResolvedValue(false);

    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("explains other failures", async () => {
    vi.mocked(login).mockRejectedValue(new Error("Too many attempts. Please try again later."));

    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("Too many attempts");
  });

  it("links to the registration screen", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/register");
  });
});
