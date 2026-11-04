import type { Social } from "./types";
import { profile } from "./profile";
import { gmailComposeUrl } from "@/lib/contactUrl";

export const socials: Social[] = [
  { id: "github", label: "GitHub", href: "https://github.com/McLector", icon: "github", hexIndex: 0 },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/myremorada/", icon: "linkedin", hexIndex: 1 },
  // Gmail compose, not `mailto:` — a mailto does nothing on a machine with no mail app registered.
  { id: "email", label: "Email", href: gmailComposeUrl(profile.email), icon: "email", hexIndex: 2 },
  { id: "x", label: "X", href: "https://x.com/mclectorr", icon: "x", hexIndex: 3 },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/maljamore/", icon: "instagram", hexIndex: 4 },
  { id: "upwork", label: "Upwork", href: "https://www.upwork.com/freelancers/~01894ee04fe2d6293e", icon: "upwork", hexIndex: 5 },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@mclectorr", icon: "tiktok", hexIndex: 6 },
];
