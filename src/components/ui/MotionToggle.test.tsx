import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionToggle } from "./MotionToggle";

describe("MotionToggle", () => {
  const root = document.documentElement;

  beforeEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
  });
  afterEach(() => {
    root.removeAttribute("data-motion");
    localStorage.clear();
  });

  it("is one button, named 'Animations', pressed while animations are on", () => {
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Animations" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-testid", "motion-toggle");
  });

  it("keeps a STABLE accessible name in both states — the state is aria-pressed, not the label", async () => {
    // ThemeToggle changes its label with its state AND sets aria-pressed, which announces twice.
    render(<MotionToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Animations" }));
    expect(screen.getByRole("button", { name: "Animations" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the current state in its tooltip", async () => {
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Animations" });
    expect(button).toHaveAttribute("title", "Animations: on");
    await userEvent.click(button);
    expect(button).toHaveAttribute("title", "Animations: off");
  });

  it("clicking switches the setting on <html> and remembers it", async () => {
    render(<MotionToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Animations" }));
    expect(root.getAttribute("data-motion")).toBe("off");
    expect(localStorage.getItem("mclector-motion")).toBe("off");
    await userEvent.click(screen.getByRole("button", { name: "Animations" }));
    expect(root.getAttribute("data-motion")).toBe("on");
    expect(localStorage.getItem("mclector-motion")).toBe("on");
  });

  it("is keyboard operable with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Animations" });
    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.keyboard(" ");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects an 'off' the boot script already put on <html>", () => {
    root.setAttribute("data-motion", "off");
    render(<MotionToggle />);
    expect(screen.getByRole("button", { name: "Animations" })).toHaveAttribute("aria-pressed", "false");
  });

  it("draws a different glyph for on and off, so the state is not carried by colour alone", async () => {
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Animations" });
    const on = button.innerHTML;
    await userEvent.click(button);
    expect(button.innerHTML).not.toBe(on);
  });

  it("hides its decorative icon from assistive tech", () => {
    render(<MotionToggle />);
    expect(screen.getByRole("button", { name: "Animations" }).querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
