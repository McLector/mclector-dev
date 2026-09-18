import type { Social } from "./types";
import { profile } from "./profile";

export const socials: Social[] = [
  { id: "github", label: "GitHub", href: "https://github.com/McLector", icon: "github", hexIndex: 0 },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/myremorada/", icon: "linkedin", hexIndex: 1 },
  { id: "email", label: "Email", href: `mailto:${profile.email}`, icon: "email", hexIndex: 2 },
];
