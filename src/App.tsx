import { useState } from "react";
import { content } from "@/content";
import { BentoGrid } from "@/layout/BentoGrid";
import { GradientBackdrop } from "@/layout/GradientBackdrop";
import { ProjectOverlay } from "@/components/Overlay/ProjectOverlay";
import { ContactDialog } from "@/features/contact/ContactDialog";

/**
 * Composition root. Owned by Phase 0 — no stream edits this file. Mounts
 * the layout, the (always-present) project overlay, and the contact
 * dialog, and wires ActionsRow's onContact callback to it.
 */
export default function App() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <GradientBackdrop />
      <main className="min-h-dvh px-4 py-6 sm:px-6 lg:p-0">
        <BentoGrid content={content} onContact={() => setContactOpen(true)} />
      </main>
      <ProjectOverlay projects={content.projects} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
