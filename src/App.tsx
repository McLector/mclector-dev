import { useState } from "react";
import { content } from "@/content";
import { BentoGrid } from "@/layout/BentoGrid";
import { AppFrame } from "@/layout/AppFrame";
import { GalaxyBackdrop } from "@/layout/GalaxyBackdrop";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ProjectOverlay } from "@/components/Overlay/ProjectOverlay";
import { ContactDialog } from "@/features/contact/ContactDialog";

/**
 * Composition root. Mounts the full-bleed galaxy, the day/night toggle, the
 * fluid content column, the (always-present) project overlay and the contact
 * dialog. The portfolio scrolls naturally — no fixed one-screen lock — so it
 * scales to any viewport without the visitor reaching for browser zoom.
 */
export default function App() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <GalaxyBackdrop />
      <div className="fixed top-4 right-4 z-40 sm:top-5 sm:right-5">
        <ThemeToggle />
      </div>

      <AppFrame>
        <BentoGrid content={content} onContact={() => setContactOpen(true)} />
      </AppFrame>

      <ProjectOverlay projects={content.projects} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
