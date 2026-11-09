import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "@/lib/api";
import RegisterPage from "./page";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/lib/api", () => ({ register: vi.fn() }));

afterEach(() => vi.clearAllMocks());

async function submit(name: string, email: string, password: string) {
  render(<RegisterPage />);
  fireEvent.change(screen.getByLabelText(/Name/), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: password } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  });
}

describe("RegisterPage (AC18.1)", () => {
  it("creates the account and goes to the dashboard", async () => {
    vi.mocked(register).mockResolvedValue({
      ok: true,
      user: { id: "u1", name: "Ana", email: "ana@example.com" },
    });

    await submit("Ana", "ANA@example.com", "correct-horse");

    expect(register).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@example.com",
      password: "correct-horse",
    });
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("blocks invalid data before calling the backend", async () => {
    await submit("", "nope", "short");

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows an email already registered on its field", async () => {
    vi.mocked(register).mockResolvedValue({
      ok: false,
      fieldErrors: { email: ["This email is already registered."] },
    });

    await submit("Ana", "ana@example.com", "correct-horse");

    expect(screen.getByText("This email is already registered.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("explains other failures", async () => {
    vi.mocked(register).mockRejectedValue(new Error("Could not create the account. Please try again."));

    await submit("Ana", "ana@example.com", "correct-horse");

    expect(screen.getByRole("alert")).toHaveTextContent("Could not create the account");
  });

  it("links to the login screen", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
