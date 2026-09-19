import type { Skill } from "./types";

/**
 * The full toolbelt, rendered as a grouped icon grid (all of them, not just a
 * featured subset). `icon` is a simple-icons slug; skills with no registered
 * brand mark (React Navigation, Zustand, PostGIS, Blynk, Azure DevOps, and the
 * AI tools without a logo) omit it and get a lettered fallback tile.
 * `featured` sorts a skill first within its group.
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
  // Design + PM live in the hardware group: the display row is "Hardware · Design · PM".
  { id: "figma", label: "Figma", group: "hardware", icon: "figma" },
  { id: "azure-devops", label: "Azure DevOps", group: "hardware" },

  { id: "git", label: "Git", group: "tooling", featured: true, icon: "git" },
  { id: "vercel", label: "Vercel", group: "tooling", icon: "vercel" },
  { id: "render", label: "Render", group: "tooling", icon: "render" },
  { id: "claude-code", label: "Claude Code", group: "tooling", icon: "claude" },
  { id: "codex", label: "Codex", group: "tooling" },
  { id: "antigravity", label: "Antigravity", group: "tooling" },
  { id: "opencode", label: "OpenCode", group: "tooling" },
  { id: "cline", label: "Cline CLI", group: "tooling" },
  { id: "groq", label: "Groq", group: "tooling" },
  { id: "sapi-tts", label: "Windows SAPI TTS", group: "tooling" },
];
