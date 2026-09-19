import type { Profile } from "./types";
import portraitUrl from "@/assets/portfolio-pic.jpg";

export const profile: Profile = {
  handle: "@McLector",
  displayName: "Myre Lector",
  headline: ["Hello!", "I'm Myre Lector"],
  bioLead:
    "4th-year CS student at De La Salle Lipa University, Software Developer — building modern web and mobile applications.",
  bioRest:
    "Most of what I build starts as a project given, a problem I actually had, or sometimes just for the fun of it.",
  openTo: ["Internships", "Freelance", "Entry-level", "Remote"],
  avatar: {
    alt: "Myre Lector",
    // The hero portrait — also what the 3D hologram projects. Vite emits it as a
    // hashed asset, so this is a URL string, not bytes in the bundle.
    src: portraitUrl,
    placeholder: {
      kind: "monogram",
      seed: "ML",
      from: "#4f7cff",
      to: "#b34fff",
    },
  },
  badge: {
    title: "Myre Lector",
    subtitle: "CS Student · Mobile Dev",
    idLabel: "DLSL-2026",
    caption: "Digital Pass",
  },
  location: {
    city: "Batangas",
    country: "Philippines",
    timeZone: "Asia/Manila",
    utcLabel: "GMT+8",
    mapTexture: {
      alt: "Map of Batangas, Philippines",
      placeholder: {
        kind: "pattern",
        seed: "batangas-ph",
        from: "#161622",
        to: "#0a0a0f",
      },
    },
  },
  email: "moradamyre@gmail.com",
  cv: {
    label: "Download CV",
    available: false,
  },
};
