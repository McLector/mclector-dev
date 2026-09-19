import type { SiteContent } from "@/content/types";
import { IntroCard } from "@/features/intro/IntroCard";
import { SkillsCard } from "@/features/skills/SkillsCard";
import { ActionsRow } from "@/features/actions/ActionsRow";
import { LocationCard } from "@/features/location/LocationCard";
import { PassCard } from "@/features/pass/PassCard";
import { SocialHex } from "@/features/social/SocialHex";
import { ProjectsCard } from "@/features/projects/ProjectsCard";
import { CertificationsCard } from "@/features/certifications/CertificationsCard";
import "./bento.css";

/**
 * The window interior: three columns — an identity rail (left), the hologram
 * stage (centre), and a feed rail (right). Columns are flex so the list-heavy
 * cards (skills, projects) grow to fill the fixed-height window, and the
 * centre column gives the 3D room to breathe. On mobile the columns collapse
 * (via `display: contents` in bento.css) and each card is re-ordered into a
 * single scrolling stack.
 */
export function BentoGrid({
  content,
  onContact,
}: {
  content: SiteContent;
  onContact: () => void;
}) {
  return (
    <div className="bento">
      <div className="bento__col">
        <IntroCard profile={content.profile} />
        <SkillsCard skills={content.skills} />
        <LocationCard location={content.profile.location} />
        <ActionsRow profile={content.profile} onContact={onContact} />
      </div>

      <div className="bento__col bento__col--center">
        <PassCard profile={content.profile} />
      </div>

      <div className="bento__col">
        <SocialHex socials={content.socials} />
        <ProjectsCard projects={content.projects} />
        <CertificationsCard certifications={content.certifications} />
      </div>
    </div>
  );
}
