import type { Social } from "./types";
import { profile } from "./profile";
import { gmailComposeUrl } from "@/lib/contactUrl";

export const socials: Social[] = [
  { id: "github", label: "GitHub", href: "https://github.com/McLector", icon: "github", hexIndex: 0 },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/myremorada/", icon: "linkedin", hexIndex: 1 },
  // Gmail compose, not `mailto:` — a mailto does nothing on a machine with no mail app registered.
  { id: "email", label: "Email", href: gmailComposeUrl(profile.email), icon: "email", hexIndex: 2 },
  // TODO: real URL — owner to supply. "#" keeps the honeycomb full (2·3·2) until then.
  { id: "x", label: "X", href: "#", icon: "x", hexIndex: 3 },
  // TODO: real URL — owner to supply.
  { id: "instagram", label: "Instagram", href: "#", icon: "instagram", hexIndex: 4 },
  // TODO: real URL — owner to supply (their Upwork profile).
  { id: "upwork", label: "Upwork", href: "#", icon: "upwork", hexIndex: 5 },
  // TODO: real URL — owner to supply.
  { id: "tiktok", label: "TikTok", href: "#", icon: "tiktok", hexIndex: 6 },
];
