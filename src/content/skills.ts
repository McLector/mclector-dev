import type { Skill } from "./types";

/**
 * The full toolbelt, rendered as a grouped icon grid (all of them, not just a
 * featured subset). `icon` is a simple-icons slug; skills with no registered
 * brand mark omit it and get a lettered fallback tile (none currently do). Marks
 * come from simple-icons or customIcons.ts (see there for sources; four are hand-drawn).
 * `featured` sorts a skill first within its group.
 */
export const skills: Skill[] = [
  { id: "typescript", label: "TypeScript", group: "language", featured: true, icon: "typescript" },
  { id: "javascript", label: "JavaScript", group: "language", featured: true, icon: "javascript" },
  { id: "python", label: "Python", group: "language", icon: "python" },
  { id: "cpp", label: "C++", group: "language", icon: "cplusplus" },

  { id: "react-native", label: "React Native", group: "mobile", featured: true, icon: "react" },
  { id: "expo", label: "Expo", group: "mobile", featured: true, icon: "expo" },
  { id: "react-navigation", label: "React Navigation", group: "mobile", icon: "reactnavigation" },

  { id: "nextjs", label: "Next.js", group: "web", icon: "nextdotjs" },
  { id: "tailwind", label: "Tailwind CSS", group: "web", featured: true, icon: "tailwindcss" },
  { id: "zustand", label: "Zustand", group: "web", icon: "zustand" },
  { id: "shadcn", label: "shadcn/ui", group: "web", icon: "shadcnui" },

  { id: "supabase", label: "Supabase", group: "data", featured: true, icon: "supabase" },
  { id: "postgresql", label: "PostgreSQL", group: "data", icon: "postgresql" },
  { id: "postgis", label: "PostGIS", group: "data", icon: "postgis" },

  { id: "esp32", label: "ESP32", group: "hardware", icon: "espressif" },
  { id: "arduino", label: "Arduino", group: "hardware", icon: "arduino" },
  { id: "blynk", label: "Blynk", group: "hardware", icon: "blynk" },
  // Design + PM live in the hardware group: the display row is "Hardware · Design · PM".
  { id: "figma", label: "Figma", group: "hardware", icon: "figma" },
  { id: "azure-devops", label: "Azure DevOps", group: "hardware", icon: "azuredevops" },

  { id: "git", label: "Git", group: "tooling", featured: true, icon: "git" },
  { id: "vercel", label: "Vercel", group: "tooling", icon: "vercel" },
  { id: "render", label: "Render", group: "tooling", icon: "render" },
  { id: "claude-code", label: "Claude Code", group: "tooling", icon: "claude" },
  { id: "codex", label: "Codex", group: "tooling", icon: "openai" },
  { id: "antigravity", label: "Antigravity", group: "tooling", icon: "antigravity" },
  { id: "opencode", label: "OpenCode", group: "tooling", icon: "opencode" },
  { id: "cline", label: "Cline CLI", group: "tooling", icon: "cline" },
  { id: "groq", label: "Groq", group: "tooling", icon: "groq" },
  { id: "sapi-tts", label: "Windows SAPI TTS", group: "tooling", icon: "windows" },
];
