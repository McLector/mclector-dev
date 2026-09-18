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
 * The grid-area contract that lets every stream land independently. This
 * file is owned by Phase 0 — no stream edits it. Each imported component
 * already targets its final path; a stream "lands" by replacing that
 * component file's contents, never by touching this composition.
 */
export function BentoGrid({
  content,
  onContact,
}: {
  content: SiteContent;
  onContact: () => void;
}) {
  return (
    <div className="bento w-full">
      <IntroCard profile={content.profile} />
      <SkillsCard skills={content.skills} />
      <PassCard profile={content.profile} />
      <SocialHex socials={content.socials} />
      <LocationCard location={content.profile.location} />
      <ProjectsCard projects={content.projects} />
      <CertificationsCard certifications={content.certifications} />
      <ActionsRow profile={content.profile} onContact={onContact} />
    </div>
  );
}
