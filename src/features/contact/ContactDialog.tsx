/**
 * PLACEHOLDER — owned by Stream F. Frozen contract:
 *   <ContactDialog open={boolean} onClose={() => void} />
 * Opened by Stream A's ActionsRow via the `onContact` callback, wired in
 * App.tsx. Stream F also owns api/contact.ts and src/lib/contactSchema.ts
 * (shared by both the form and the serverless handler).
 */
export function ContactDialog({
  open,
  onClose: _onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return null;
}
