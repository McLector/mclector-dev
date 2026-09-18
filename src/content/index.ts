import type { SiteContent } from "./types";
import { profile } from "./profile";
import { skills } from "./skills";
import { projects } from "./projects";
import { socials } from "./socials";
import { certifications } from "./certifications";

export const content: SiteContent = {
  profile,
  skills,
  projects,
  socials,
  certifications,
};

export type {
  SiteContent,
  Profile,
  Skill,
  SkillGroup,
  Project,
  ProjectStatus,
  ProjectLink,
  Social,
  SocialIconName,
  Certification,
  CertificationStatus,
  ImageRef,
} from "./types";
