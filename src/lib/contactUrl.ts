/**
 * Where "email me" leads.
 *
 * A `mailto:` link hands off to whatever mail app the visitor's OS has registered — on many
 * desktops that is nothing, so the click appears to do nothing at all. A web page cannot
 * force Gmail from a `mailto:`, but it can link straight to Gmail's compose window, already
 * addressed. Someone signed in to Google lands on a ready-to-send message; anyone else gets
 * Gmail's sign-in and then the same message.
 *
 * Returns "" for a blank address so a caller can omit the link instead of rendering a dead one.
 */
export function gmailComposeUrl(email: string): string {
  const to = email.trim();
  if (!to) return "";
  // encodeURIComponent, not raw interpolation: "+" and "&" in an address must not corrupt or extend the query.
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}`;
}
