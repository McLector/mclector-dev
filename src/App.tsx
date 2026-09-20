import { content } from "@/content";
import { BentoGrid } from "@/layout/BentoGrid";
import { AppFrame } from "@/layout/AppFrame";
import { GalaxyBackdrop } from "@/layout/GalaxyBackdrop";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MotionToggle } from "@/components/ui/MotionToggle";
import { ProjectOverlay } from "@/components/Overlay/ProjectOverlay";

/**
 * Composition root. Mounts the full-bleed galaxy, the two round toggles (day/night, with the Animations
 * switch stacked directly beneath it), the scaled window with the portfolio in it, and the (always-present)
 * project overlay. Contact is a Gmail-compose sign in the centre column — there is no
 * contact form or dialog. The portfolio fits one screen by scaling as a unit,
 * so it works at any viewport without the visitor reaching for browser zoom.
 */
export default function App() {
  return (
    <>
      <GalaxyBackdrop />
      <div className="toggle-dock">
        <ThemeToggle />
        <MotionToggle />
      </div>

      <AppFrame>
        <BentoGrid content={content} />
      </AppFrame>

      <ProjectOverlay projects={content.projects} />
    </>
  );
}
