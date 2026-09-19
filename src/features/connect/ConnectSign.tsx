import "./connect.css";

/**
 * The "Let's Connect → email" neon sign at the top of the centre column,
 * centred on the same axis as the hologram and the Download CV button.
 *
 * Rendered as a bare anchor, deliberately NOT inside <BentoCard>: BentoCard is
 * `overflow-hidden`, which would clip the sign's outer glow and hover halo. The
 * visible text is the accessible name (no aria-label override), with the
 * decorative arrow hidden. With no address there is nothing to link to, so
 * nothing renders rather than a dead link.
 */
export function ConnectSign({ email }: { email: string }) {
  if (!email) return null;

  return (
    <a data-bento-area="connect" href={`mailto:${email}`} className="connect-sign">
      <span className="connect-sign__label">
        Let's Connect
        <span className="connect-sign__arrow" aria-hidden="true">
          →
        </span>
      </span>{" "}
      <span className="connect-sign__email">{email}</span>
    </a>
  );
}
