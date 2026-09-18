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
      {/* The wallpaper shows through this padding on desktop as a colored frame;
          on mobile the window goes edge-to-edge so the content stays usable. */}
      <main className="flex min-h-dvh w-full justify-center p-0 lg:p-5 xl:p-6">
        <div className="app-window w-full max-w-[1680px] min-h-dvh rounded-none lg:h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:rounded-[var(--radius-window)] xl:h-[calc(100dvh-3rem)]">
          <BentoGrid content={content} onContact={() => setContactOpen(true)} />
        </div>
      </main>
      <ProjectOverlay projects={content.projects} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
