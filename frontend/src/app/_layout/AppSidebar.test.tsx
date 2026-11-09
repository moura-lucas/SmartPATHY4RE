import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ logout: vi.fn() }));

const user = { id: "u1", name: "Alex Morgan", email: "alex@example.com" };

describe("AppSidebar", () => {
  beforeEach(() => vi.mocked(usePathname).mockReturnValue("/"));

  it("links to the main sections", () => {
    render(<AppSidebar user={user} />);

    for (const [name, href] of [
      ["Dashboard", "/"],
      ["Projects", "/projects"],
      ["Settings", "/settings"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("shows the name and email of the signed-in user", () => {
    render(<AppSidebar user={user} />);

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it.each([
    ["/", "Dashboard"],
    ["/projects", "Projects"],
    ["/projects/abc/persona", "Projects"],
    ["/settings", "Settings"],
  ])("marks only the current section on %s", (path, expected) => {
    vi.mocked(usePathname).mockReturnValue(path);
    render(<AppSidebar user={user} />);

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([expected]);
  });
});
