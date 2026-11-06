import { act, fireEvent, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generatePersona } from "@/lib/api";
import { GENERATION_ERROR_MESSAGES, GenerationError } from "@/lib/generation";
import { buildPersona } from "@/test/fixtures";
import { GeneratePersonaButton } from "./GeneratePersonaButton";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({ generatePersona: vi.fn() }));

/** A request that only settles when the test says so. */
function pendingRequest() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  vi.mocked(generatePersona).mockImplementationOnce(
    () =>
      new Promise((res, rej) => {
        resolve = () => res(buildPersona());
        reject = rej;
      }),
  );
  return {
    resolve: () => act(async () => resolve()),
    reject: (err: unknown) => act(async () => reject(err)),
  };
}

function renderButton() {
  render(
    <>
      <Link href="/projects/project-1">Back to project</Link>
      <GeneratePersonaButton projectId="project-1" />
    </>,
  );
}

const generateButton = () => screen.getByRole("button", { name: /Generat/ });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GeneratePersonaButton (US11)", () => {
  it("shows the current step and disables the button while generating (AC11.1)", async () => {
    pendingRequest();
    renderButton();

    fireEvent.click(generateButton());

    expect(screen.getByText("Generating PATHY persona…")).toBeInTheDocument();
    expect(generateButton()).toBeDisabled();
    fireEvent.click(generateButton());
    expect(generatePersona).toHaveBeenCalledTimes(1);
  });

  it("shows the elapsed time only after 20 seconds (AC11.2)", async () => {
    pendingRequest();
    renderButton();
    fireEvent.click(generateButton());

    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.queryByText(/Elapsed time/)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("Elapsed time: 0:21.")).toBeInTheDocument();
    expect(screen.getByText("This may take up to about 1 minute.")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(45_000));
    expect(screen.getByText("Elapsed time: 1:06.")).toBeInTheDocument();
  });

  it("explains the failure and retries the same request (AC11.3 / AC11.4)", async () => {
    const first = pendingRequest();
    renderButton();
    fireEvent.click(generateButton());

    await first.reject(
      new GenerationError(GENERATION_ERROR_MESSAGES.ai_rate_limited, "ai_rate_limited"),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(GENERATION_ERROR_MESSAGES.ai_rate_limited);
    expect(generateButton()).toBeEnabled();

    const second = pendingRequest();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await second.resolve();

    expect(generatePersona).toHaveBeenNthCalledWith(2, "project-1");
    expect(push).toHaveBeenCalledWith("/projects/project-1/persona");
  });

  it("restarts the elapsed time on retry", async () => {
    const first = pendingRequest();
    renderButton();
    fireEvent.click(generateButton());
    act(() => vi.advanceTimersByTime(30_000));
    await first.reject(new Error("boom"));

    pendingRequest();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    act(() => vi.advanceTimersByTime(5_000));

    expect(screen.queryByText(/Elapsed time/)).not.toBeInTheDocument();
  });

  it("asks the browser to confirm closing or reloading only while generating (AC11.5)", async () => {
    const request = pendingRequest();
    renderButton();
    const beforeUnload = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(beforeUnload()).toBe(false);
    fireEvent.click(generateButton());
    expect(beforeUnload()).toBe(true);

    await request.reject(new Error("boom"));
    expect(beforeUnload()).toBe(false);
  });

  it("holds internal links until the user confirms leaving (AC11.5)", async () => {
    pendingRequest();
    renderButton();
    fireEvent.click(generateButton());

    fireEvent.click(screen.getByRole("link", { name: "Back to project" }));
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent("its result may be lost");

    fireEvent.click(screen.getByRole("button", { name: "Stay on page", hidden: true }));
    expect(dialog).not.toHaveAttribute("open");
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("link", { name: "Back to project" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave anyway", hidden: true }));
    expect(push).toHaveBeenCalledWith("/projects/project-1");
  });

  it("does not hold links when nothing is being generated", () => {
    renderButton();

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Back to project" }));

    expect(notPrevented).toBe(true);
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });
});
