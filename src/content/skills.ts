import type { Skill } from "./types";

/**
 * The full toolbelt, rendered as a grouped icon grid (all of them, not just a
 * featured subset). `icon` is a simple-icons slug; skills with no brand mark
 * (React Navigation, Zustand, PostGIS, Blynk, Azure DevOps) omit it and get a
 * lettered fallback tile. `featured` sorts a skill first within its group.
 */
export const skills: Skill[] = [
  { id: "typescript", label: "TypeScript", group: "language", featured: true, icon: "typescript" },
  { id: "javascript", label: "JavaScript", group: "language", featured: true, icon: "javascript" },
  { id: "python", label: "Python", group: "language", icon: "python" },
  { id: "cpp", label: "C++", group: "language", icon: "cplusplus" },

  { id: "react-native", label: "React Native", group: "mobile", featured: true, icon: "react" },
  { id: "expo", label: "Expo", group: "mobile", featured: true, icon: "expo" },
  { id: "react-navigation", label: "React Navigation", group: "mobile" },

  { id: "nextjs", label: "Next.js", group: "web", icon: "nextdotjs" },
  { id: "tailwind", label: "Tailwind CSS", group: "web", featured: true, icon: "tailwindcss" },
  { id: "zustand", label: "Zustand", group: "web" },
  { id: "shadcn", label: "shadcn/ui", group: "web", icon: "shadcnui" },

  { id: "supabase", label: "Supabase", group: "data", featured: true, icon: "supabase" },
  { id: "postgresql", label: "PostgreSQL", group: "data", icon: "postgresql" },
  { id: "postgis", label: "PostGIS", group: "data" },

  { id: "esp32", label: "ESP32", group: "hardware", icon: "espressif" },
  { id: "arduino", label: "Arduino", group: "hardware", icon: "arduino" },
  { id: "blynk", label: "Blynk", group: "hardware" },

  { id: "figma", label: "Figma", group: "tooling", icon: "figma" },
  { id: "azure-devops", label: "Azure DevOps", group: "tooling" },
  { id: "git", label: "Git", group: "tooling", featured: true, icon: "git" },
  { id: "vercel", label: "Vercel", group: "tooling", icon: "vercel" },
];
