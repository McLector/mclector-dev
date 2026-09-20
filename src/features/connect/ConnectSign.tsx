import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { gmailComposeUrl } from "@/lib/contactUrl";
import "./connect.css";

/**
 * The "Let's Connect → email" neon sign at the top of the centre column,
 * centred on the same axis as the hologram and the Download CV button.
 *
 * It links to Gmail's compose window (see `gmailComposeUrl`) in a new tab, not to a
 * `mailto:`, which does nothing on a machine with no mail app registered.
 *
 * Rendered as a bare anchor, deliberately NOT inside <BentoCard>: BentoCard is
 * `overflow-hidden`, which would clip the sign's outer glow and hover halo. The
 * accessible name is the visible text plus a hidden note that the link opens a new
 * tab (no aria-label override). It carries no decorative ornament: the nudging arrow
 * it used to have was one of the tells that made it look generated. With no address
 * there is nothing to link to, so nothing renders rather than a dead link.
 */
export function ConnectSign({ email }: { email: string }) {
  const address = email.trim();
  const href = gmailComposeUrl(address);
  if (!href) return null;

  return (
    <a
      data-bento-area="connect"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="connect-sign"
    >
      <span className="connect-sign__label">Let's Connect</span>{" "}
      <span className="connect-sign__email">{address}</span>{" "}
      {/* Out of flow (absolute), so it adds no gap to the sign; the space above keeps the name spaced. */}
      <VisuallyHidden>(opens Gmail compose in a new tab)</VisuallyHidden>
    </a>
  );
}
