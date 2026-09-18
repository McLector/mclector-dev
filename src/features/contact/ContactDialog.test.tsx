import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactDialog } from "./ContactDialog";
import { content } from "@/content";

/**
 * Stream F — the contact dialog.
 *
 * Every one of the five response shapes in docs/contracts.md gets its own
 * test, because "the network came back" is where a contact form actually
 * fails a real user: a 503 that looks like a 500 loses the message the
 * `mailto:` fallback would have saved.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Fills the three real fields with values that pass client validation. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), "Myre Lector");
  await user.type(screen.getByLabelText(/your email/i), "someone@example.com");
  await user.type(
    screen.getByLabelText(/message/i),
    "Hello, I would like to talk about an internship.",
  );
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));
}

describe("ContactDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<ContactDialog open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a modal dialog portalled to the body when open", () => {
    const { container } = render(<ContactDialog open onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName();
    // Portalled: it is in the document but NOT inside the component's own
    // container, so the bento grid's overflow/stacking can never clip it.
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
  });

  describe("dismissal", () => {
    it("closes on Escape", async () => {
      const onClose = vi.fn();
      render(<ContactDialog open onClose={onClose} />);
      await userEvent.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes on a backdrop click", async () => {
      const onClose = vi.fn();
      render(<ContactDialog open onClose={onClose} />);
      await userEvent.click(screen.getByTestId("contact-backdrop"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does NOT close when the click lands inside the dialog", async () => {
      const onClose = vi.fn();
      render(<ContactDialog open onClose={onClose} />);
      await userEvent.click(screen.getByLabelText(/your name/i));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes from the explicit close button", async () => {
      const onClose = vi.fn();
      render(<ContactDialog open onClose={onClose} />);
      await userEvent.click(screen.getByRole("button", { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("focus", () => {
    it("moves focus into the dialog on open", async () => {
      render(<ContactDialog open onClose={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toContainElement(
          document.activeElement as HTMLElement,
        );
      });
    });

    it("focuses the first real field, not the honeypot", async () => {
      render(<ContactDialog open onClose={vi.fn()} />);
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByLabelText(/your name/i));
      });
    });
  });

  describe("honeypot", () => {
    it("renders the company field but keeps it out of the tab order", () => {
      render(<ContactDialog open onClose={vi.fn()} />);
      const honeypot = screen.getByTestId("contact-company");
      expect(honeypot).toBeInTheDocument();
      expect(honeypot).toHaveAttribute("tabindex", "-1");
      expect(honeypot).toHaveAttribute("aria-hidden", "true");
      expect(honeypot).toHaveAttribute("autocomplete", "off");
    });

    it("hides it off-screen rather than with display:none (bots skip display:none)", () => {
      render(<ContactDialog open onClose={vi.fn()} />);
      const wrapper = screen.getByTestId("contact-company-field");
      const style = wrapper.getAttribute("style") ?? "";
      expect(style).not.toMatch(/display:\s*none/);
      expect(style).not.toMatch(/visibility:\s*hidden/);
      expect(style).toMatch(/position:\s*absolute/);
      expect(style).toMatch(/left:\s*-9999px/);
    });

    it("is skipped when tabbing through the form", async () => {
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      const honeypot = screen.getByTestId("contact-company");
      for (let i = 0; i < 8; i += 1) {
        await user.tab();
        expect(document.activeElement).not.toBe(honeypot);
      }
    });

    it("submits an empty company value with the payload", async () => {
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
      expect(sent.company).toBe("");
    });
  });

  describe("startedAt", () => {
    it("records the open time as a finite millisecond timestamp", async () => {
      const user = userEvent.setup();
      const before = Date.now();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
      expect(Number.isFinite(sent.startedAt)).toBe(true);
      expect(sent.startedAt).toBeGreaterThanOrEqual(before);
      expect(sent.startedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("client-side validation", () => {
    it("shows per-field errors and never touches the network", async () => {
      render(<ContactDialog open onClose={vi.fn()} />);
      submit();
      await screen.findByText(/please tell me your name/i);
      expect(screen.getByText(/does not look like an email/i)).toBeInTheDocument();
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("wires each error to its input with aria-describedby and aria-invalid", async () => {
      render(<ContactDialog open onClose={vi.fn()} />);
      submit();
      const name = await screen.findByLabelText(/your name/i);
      expect(name).toHaveAttribute("aria-invalid", "true");
      const describedBy = name.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)).toHaveTextContent(/name/i);
    });

    it("rejects a too-short message before sending", async () => {
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await user.type(screen.getByLabelText(/your name/i), "Myre");
      await user.type(screen.getByLabelText(/your email/i), "a@example.com");
      await user.type(screen.getByLabelText(/message/i), "too short");
      submit();
      await screen.findByText(/at least 10 characters/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("clears a field's error once it is corrected and resubmitted", async () => {
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      submit();
      await screen.findByText(/please tell me your name/i);
      await fillValidForm(user);
      submit();
      await waitFor(() =>
        expect(screen.queryByText(/please tell me your name/i)).not.toBeInTheDocument(),
      );
    });
  });

  describe("request", () => {
    it("POSTs JSON to /api/contact", async () => {
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/api/contact");
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
      const sent = JSON.parse(String(init.body));
      expect(sent).toMatchObject({
        name: "Myre Lector",
        email: "someone@example.com",
        company: "",
      });
    });
  });

  describe("response handling — the five shapes in docs/contracts.md", () => {
    it("200 → announces success in a live region", async () => {
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent(/thank|sent|on its way/i);
    });

    it("200 → closes the dialog after a moment", async () => {
      vi.useFakeTimers();
      try {
        const onClose = vi.fn();
        render(<ContactDialog open onClose={onClose} />);
        fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Myre" } });
        fireEvent.change(screen.getByLabelText(/your email/i), {
          target: { value: "a@example.com" },
        });
        fireEvent.change(screen.getByLabelText(/message/i), {
          target: { value: "A long enough message." },
        });
        submit();
        await act(async () => {
          await Promise.resolve();
        });
        expect(onClose).not.toHaveBeenCalled();
        await act(async () => {
          vi.advanceTimersByTime(5_000);
        });
        expect(onClose).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("400 → maps the server's field errors back onto the inputs", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, { ok: false, errors: { email: "Server says this address is bad." } }),
      );
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await screen.findByText("Server says this address is bad.");
      expect(screen.getByLabelText(/your email/i)).toHaveAttribute("aria-invalid", "true");
    });

    it("400 with an unmapped error still tells the user something", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, { ok: false, errors: { _form: "Something was off." } }),
      );
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await screen.findByText("Something was off.");
    });

    it("429 → asks the user to wait and try again", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(429, { ok: false, reason: "rate-limited" }));
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/wait|moment|too many/i);
      expect(within(alert).queryByRole("link")).not.toBeInTheDocument();
    });

    it("503 → reveals the mailto: fallback with the real address", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503, { ok: false, reason: "not-configured" }));
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      const fallback = await screen.findByTestId("contact-mailto");
      expect(fallback).toHaveAttribute("href", `mailto:${content.profile.email}`);
      expect(content.profile.email).toBe("moradamyre@gmail.com");
    });

    it("500 → offers a retry rather than a dead end", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(500, { ok: false, reason: "server-error" }));
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await screen.findByRole("alert");
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("a thrown network error is caught and offers a retry", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/could not|went wrong|try again/i);
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("a retry re-sends and can succeed", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await screen.findByRole("alert");
      await user.click(screen.getByRole("button", { name: /try again/i }));
      await screen.findByRole("status");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("an unparseable success body is still treated as a failure, not a crash", async () => {
      fetchMock.mockResolvedValueOnce(new Response("<html>gateway</html>", { status: 502 }));
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();
      await screen.findByRole("alert");
    });
  });

  describe("double submission", () => {
    it("disables the submit button while a request is in flight", async () => {
      let release: (value: Response) => void = () => {};
      fetchMock.mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      );
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      submit();

      const button = await screen.findByRole("button", { name: /sending/i });
      await waitFor(() => expect(button).toBeDisabled());

      await act(async () => {
        release(jsonResponse(200, { ok: true }));
      });
    });

    it("sends exactly once even when the button is clicked twice quickly", async () => {
      fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}));
      const user = userEvent.setup();
      render(<ContactDialog open onClose={vi.fn()} />);
      await fillValidForm(user);
      const button = screen.getByRole("button", { name: /send message/i });
      fireEvent.click(button);
      fireEvent.click(button);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
