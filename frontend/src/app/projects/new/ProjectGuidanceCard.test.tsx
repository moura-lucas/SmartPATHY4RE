import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectGuidanceCard } from "./ProjectGuidanceCard";

describe("ProjectGuidanceCard", () => {
  it("explains why the information matters and lists the tips", () => {
    render(<ProjectGuidanceCard />);

    const card = screen.getByRole("region", { name: "Why is this information important?" });
    expect(within(card).getByRole("heading", { name: "Tips for a good description" })).toBeInTheDocument();
    expect(within(card).getAllByRole("listitem")).toHaveLength(4);
  });
});
