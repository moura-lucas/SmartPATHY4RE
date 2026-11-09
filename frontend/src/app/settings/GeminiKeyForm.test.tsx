import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { GeminiKeyStatusDto } from "@smartpathy/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteGeminiKey, saveGeminiKey } from "@/lib/api";
import { GeminiKeyForm } from "./GeminiKeyForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api", () => ({ saveGeminiKey: vi.fn(), deleteGeminiKey: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const noKey: GeminiKeyStatusDto = { hasKey: false, last4: null, dailyLimit: 5, usedToday: 2 };
const withKey: GeminiKeyStatusDto = { hasKey: true, last4: "GzMw", dailyLimit: 5, usedToday: 0 };

async function submit(value: string) {
  fireEvent.change(screen.getByLabelText(/key/i, { selector: "input" }), { target: { value } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Save key|Checking/ }));
  });
}

describe("GeminiKeyForm", () => {
  it("shows the day's usage of the shared key", () => {
    render(<GeminiKeyForm status={noKey} />);

    expect(screen.getByText(/2 of 5 free generations used today/)).toBeInTheDocument();
  });

  it("hides what is typed", () => {
    render(<GeminiKeyForm status={noKey} />);

    expect(screen.getByLabelText(/key/i, { selector: "input" })).toHaveAttribute("type", "password");
  });

  it("saves a key and clears the field", async () => {
    vi.mocked(saveGeminiKey).mockResolvedValue({ ok: true });
    render(<GeminiKeyForm status={noKey} />);

    await submit("  AIzaSyKey  ");

    expect(saveGeminiKey).toHaveBeenCalledWith("AIzaSyKey");
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Save key" })).not.toBeInTheDocument();
  });

  it("blocks an empty key before calling the backend", async () => {
    render(<GeminiKeyForm status={noKey} />);

    await submit("   ");

    expect(screen.getByText("Enter your Gemini API key")).toBeInTheDocument();
    expect(saveGeminiKey).not.toHaveBeenCalled();
  });

  it("shows why a key was refused, on the field", async () => {
    vi.mocked(saveGeminiKey).mockResolvedValue({
      ok: false,
      error: "Google did not accept this key. Check it and try again.",
    });
    render(<GeminiKeyForm status={noKey} />);

    await submit("AIzaSyWrong");

    expect(screen.getByText(/Google did not accept this key/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("only shows how a saved key ends", () => {
    render(<GeminiKeyForm status={withKey} />);

    expect(screen.getByText("••••••••GzMw")).toBeInTheDocument();
    expect(screen.queryByText(/free generations/)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("allows replacing a saved key, and giving up", () => {
    render(<GeminiKeyForm status={withKey} />);

    fireEvent.click(screen.getByRole("button", { name: "Replace key" }));
    expect(screen.getByRole("button", { name: "Save key" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Save key" })).not.toBeInTheDocument();
  });

  it("cannot be cancelled while the key is being checked", async () => {
    vi.mocked(saveGeminiKey).mockReturnValue(new Promise(() => {}));
    render(<GeminiKeyForm status={withKey} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace key" }));

    await submit("AIzaSyKey");

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  describe("removing", () => {
    function openDialog() {
      render(<GeminiKeyForm status={withKey} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove key" }));
      return within(screen.getByRole("dialog", { hidden: true }));
    }

    it("asks for confirmation, explaining the limit", () => {
      expect(openDialog().getByText(/limited to 5 per day/)).toBeInTheDocument();
      expect(deleteGeminiKey).not.toHaveBeenCalled();
    });

    it("removes after confirmation", async () => {
      vi.mocked(deleteGeminiKey).mockResolvedValue();
      const dialog = openDialog();

      await act(async () => {
        fireEvent.click(dialog.getByRole("button", { name: "Remove key", hidden: true }));
      });

      expect(deleteGeminiKey).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalled();
    });

    it("changes nothing when cancelled", () => {
      const dialog = openDialog();

      fireEvent.click(dialog.getByRole("button", { name: "Cancel", hidden: true }));

      expect(deleteGeminiKey).not.toHaveBeenCalled();
    });
  });
});
