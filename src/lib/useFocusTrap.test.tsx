import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFocusTrap } from "./useFocusTrap";

/**
 * Stream E — the focus trap behind <ProjectOverlay>. The interesting cases
 * are the ones a naive implementation gets wrong: a focusable element added
 * AFTER mount (so the list must not be cached), an empty container, and
 * `active: false` (the trap must get out of the way entirely).
 */

function Harness({
  active = true,
  extra = false,
  empty = false,
}: {
  active?: boolean;
  extra?: boolean;
  empty?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);

  return (
    <>
      <button type="button">outside-before</button>
      <div ref={ref} data-testid="trap">
        {!empty && (
          <>
            <button type="button">first</button>
            <button type="button">middle</button>
            {extra && <a href="https://example.com">late-link</a>}
            <button type="button">last</button>
          </>
        )}
        {empty && <p>nothing focusable here</p>}
      </div>
      <button type="button">outside-after</button>
    </>
  );
}

/** Same harness, but the extra link appears only after a click. */
function DynamicHarness() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useFocusTrap(ref, true);

  return (
    <div ref={ref} data-testid="trap">
      <button type="button">first</button>
      <button type="button" onClick={() => setShown(true)}>
        reveal
      </button>
      {shown && <a href="https://example.com">late-link</a>}
      <button type="button">last</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("wraps Tab from the last focusable element back to the first", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole("button", { name: "last" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
  });

  it("wraps Shift+Tab from the first focusable element to the last", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole("button", { name: "first" }).focus();
    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: "last" })).toHaveFocus();
  });

  it("leaves ordinary Tab moves inside the container alone", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole("button", { name: "first" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "middle" })).toHaveFocus();
  });

  it("pulls focus back inside when Tab is pressed from outside the container", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    screen.getByRole("button", { name: "outside-before" }).focus();
    await user.tab();

    expect(screen.getByTestId("trap")).toContainElement(document.activeElement as HTMLElement);
  });

  it("does nothing at all when inactive", async () => {
    const user = userEvent.setup();
    render(<Harness active={false} />);

    screen.getByRole("button", { name: "last" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "outside-after" })).toHaveFocus();
  });

  it("includes an element that was present at mount in the wrap order", async () => {
    const user = userEvent.setup();
    render(<Harness extra />);

    screen.getByRole("link", { name: "late-link" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "last" })).toHaveFocus();
  });

  it("includes an element added AFTER mount (the list is not cached)", async () => {
    const user = userEvent.setup();
    render(<DynamicHarness />);

    await user.click(screen.getByRole("button", { name: "reveal" }));
    const late = await screen.findByRole("link", { name: "late-link" });

    // Shift+Tab from `last` must land on the newly added link, which only
    // happens if the focusable list is recomputed on each Tab.
    screen.getByRole("button", { name: "last" }).focus();
    await user.tab({ shift: true });
    expect(late).toHaveFocus();

    // And the wrap point moved with it.
    screen.getByRole("button", { name: "last" }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
  });

  it("does not throw when the container has zero focusable elements", async () => {
    const user = userEvent.setup();
    render(<Harness empty />);

    const trap = screen.getByTestId("trap");
    expect(trap).toBeInTheDocument();

    screen.getByRole("button", { name: "outside-before" }).focus();
    await expect(user.tab()).resolves.toBeUndefined();

    // Nothing to move to, so focus must not escape into the page behind.
    expect(screen.getByRole("button", { name: "outside-after" })).not.toHaveFocus();
  });

  it("skips disabled controls when computing the wrap boundaries", async () => {
    const user = userEvent.setup();

    function DisabledHarness() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusTrap(ref, true);
      return (
        <div ref={ref}>
          <button type="button">first</button>
          <button type="button" disabled>
            disabled-last
          </button>
        </div>
      );
    }

    render(<DisabledHarness />);
    screen.getByRole("button", { name: "first" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
  });

  it("stops trapping when `active` flips back to false", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness active />);

    rerender(<Harness active={false} />);
    screen.getByRole("button", { name: "last" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "outside-after" })).toHaveFocus();
  });
});
