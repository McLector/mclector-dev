import type { Profile } from "./types";

export const profile: Profile = {
  handle: "@McLector",
  displayName: "Myre Lector",
  headline: ["Hello!", "I'm Myre Lector"],
  bioLead: "4th-year CS student, React Native & TypeScript developer.",
  bioRest:
    "Most of what I build starts as a project given, a problem I actually had, or sometimes just for the fun of it. Currently open for internship.",
  avatar: {
    alt: "Myre Lector",
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
    country: "PH",
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
    label: "CV",
    available: false,
  },
  availability: "open-to-internship",
};
