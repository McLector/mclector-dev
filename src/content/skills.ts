import type { Skill } from "./types";

export const skills: Skill[] = [
  { id: "typescript", label: "TypeScript", group: "language", featured: true },
  { id: "javascript", label: "JavaScript", group: "language", featured: true },
  { id: "python", label: "Python", group: "language" },
  { id: "cpp", label: "C++", group: "language" },

  { id: "react-native", label: "React Native", group: "mobile", featured: true },
  { id: "expo", label: "Expo", group: "mobile", featured: true },
  { id: "react-navigation", label: "React Navigation", group: "mobile" },

  { id: "nextjs", label: "Next.js", group: "web" },
  { id: "tailwind", label: "Tailwind CSS", group: "web", featured: true },
  { id: "zustand", label: "Zustand", group: "web" },
  { id: "shadcn", label: "shadcn/ui", group: "web" },

  { id: "supabase", label: "Supabase", group: "data", featured: true },
  { id: "postgresql", label: "PostgreSQL", group: "data" },
  { id: "postgis", label: "PostGIS", group: "data" },

  { id: "esp32", label: "ESP32", group: "hardware" },
  { id: "arduino", label: "Arduino", group: "hardware" },
  { id: "blynk", label: "Blynk", group: "hardware" },

  { id: "figma", label: "Figma", group: "tooling" },
  { id: "azure-devops", label: "Azure DevOps", group: "tooling" },
  { id: "git", label: "Git", group: "tooling", featured: true },
  { id: "vercel", label: "Vercel", group: "tooling" },
];
