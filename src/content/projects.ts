import type { Project } from "./types";

export const projects: Project[] = [
  {
    id: "eiyu-system",
    title: "Eiyu-System",
    subtitle: "Habit tracker as RPG progression",
    summary:
      "Habit apps guilt you into streaks — this one turns daily habits into RPG character progression instead, grounded in Atomic Habits mechanics.",
    description: [
      "Habit apps guilt you into streaks. Eiyu-System turns daily habits into RPG character progression (Solo Leveling aesthetic) instead, grounded in Atomic Habits mechanics.",
      "Built with React Native, Expo, and Supabase. In active development, with a live demo already deployed.",
    ],
    role: "Solo developer",
    status: "in-progress",
    year: "2026",
    stack: ["React Native", "Expo", "Supabase", "TypeScript"],
    thumbnail: {
      alt: "Eiyu-System app icon",
      placeholder: { kind: "gradient", seed: "eiyu-system", from: "#ff5f7e", to: "#b34fff" },
    },
    links: [
      { label: "Live demo", href: "https://eiyu-system.vercel.app", kind: "live" },
      { label: "Repository", href: "https://github.com/McLector/Eiyu-System", kind: "repo" },
    ],
    featured: true,
  },
  {
    id: "taskbuddy",
    title: "TaskBuddy",
    subtitle: "PH home-services marketplace",
    summary:
      "Group thesis project: clients post jobs, providers apply, and a Random Forest model invites the best-matched providers once a job passes its urgency deadline.",
    description: [
      "A Philippine home-services marketplace. Clients post jobs, providers apply, and a Random Forest model invites the best-matched providers once a job passes its urgency deadline.",
      "Hiring moves real money through an escrow-backed wallet.",
      "My role: mobile developer, scrum master for our agile sprints, and a significant contribution to the planning document and paper.",
    ],
    role: "Mobile developer · Scrum master",
    status: "in-progress",
    year: "2026",
    stack: ["React Native", "Random Forest", "Escrow wallet"],
    thumbnail: {
      alt: "TaskBuddy app icon",
      placeholder: { kind: "gradient", seed: "taskbuddy", from: "#4f7cff", to: "#3ddc97" },
    },
    links: [
      { label: "Repository", href: "https://github.com/erianthe17/taskbuddy", kind: "repo" },
    ],
    featured: true,
  },
  {
    id: "stark-rent",
    title: "StarkRent",
    subtitle: "Construction equipment rental",
    summary:
      "A construction equipment rental app built with React Native, Expo SDK 57, and Supabase — with RLS and a migration-managed schema.",
    description: [
      "A construction equipment rental app. React Native + Expo SDK 57 + Supabase, with row-level security and a migration-managed schema.",
    ],
    role: "Solo developer",
    status: "in-progress",
    year: "2026",
    stack: ["React Native", "Expo SDK 57", "Supabase", "RLS"],
    thumbnail: {
      alt: "StarkRent app icon",
      placeholder: { kind: "gradient", seed: "stark-rent", from: "#f5a623", to: "#ff5f7e" },
    },
    links: [
      { label: "Repository", href: "https://github.com/McLector/Stark-Rent", kind: "repo" },
    ],
    featured: true,
  },
  {
    id: "esp32-study-monitor",
    title: "ESP32 Study Monitor",
    subtitle: "Desk-mounted IoT ergonomics monitor",
    summary:
      "A desk-mounted IoT ergonomics monitor: ESP32 + IR/PIR/sound/temperature sensors track study time and distractions, alert you to take a break, and report live to a Blynk dashboard.",
    description: [
      "A desk-mounted IoT ergonomics monitor. ESP32 with IR, PIR, sound, and temperature sensors tracks study time and distractions, alerts you to take a break, and reports live to a Blynk dashboard.",
      "Hardware and firmware, including a full debugging writeup for the trickiest sensor.",
    ],
    role: "Solo developer",
    status: "complete",
    year: "2026",
    stack: ["ESP32", "C++", "Blynk", "IoT sensors"],
    thumbnail: {
      alt: "ESP32 Study Monitor device",
      placeholder: { kind: "gradient", seed: "esp32-study-monitor", from: "#3ddc97", to: "#4f7cff" },
    },
    links: [
      { label: "Repository", href: "https://github.com/McLector/esp32-study-monitor", kind: "repo" },
    ],
    featured: true,
  },
  {
    id: "cleanops",
    title: "CleanOps",
    subtitle: "Cleaning-jobs service marketplace",
    summary:
      "A Next.js service marketplace for cleaning jobs with real-time geolocation, a mock escrow system, and job dispatching.",
    description: [
      "A Next.js service marketplace for cleaning jobs, with real-time geolocation, a mock escrow system, and job dispatching.",
      "My role: QA and primary tester, running feedback cycles with the developer; I also contributed to the planning document rather than the implementation.",
    ],
    role: "QA · Primary tester",
    status: "in-progress",
    year: "2026",
    stack: ["Next.js", "Supabase", "PostGIS"],
    thumbnail: {
      alt: "CleanOps app icon",
      placeholder: { kind: "gradient", seed: "cleanops", from: "#3ddc97", to: "#f5a623" },
    },
    links: [
      { label: "Repository", href: "https://github.com/McLector/cleanOps", kind: "repo" },
    ],
    featured: false,
  },
  {
    id: "mal-voice-assistant",
    title: "Mal Voice Assistant",
    subtitle: "Local-first AI voice assistant",
    summary:
      "A local-first voice assistant: Groq Whisper STT + LLM + Windows SAPI TTS. A quick, finished side project.",
    description: [
      "A local-first voice assistant combining Groq's Whisper speech-to-text, an LLM for responses, and Windows SAPI for text-to-speech.",
      "A quick, finished side project.",
    ],
    role: "Solo developer",
    status: "complete",
    year: "2025",
    stack: ["Python", "Groq", "Whisper", "Windows SAPI"],
    thumbnail: {
      alt: "Mal Voice Assistant icon",
      placeholder: { kind: "gradient", seed: "mal-voice-assistant", from: "#b34fff", to: "#4f7cff" },
    },
    links: [
      { label: "Repository", href: "https://github.com/McLector/mal-voice-assistant", kind: "repo" },
    ],
    featured: false,
  },
  {
    id: "vahlorun",
    title: "Vahlorun",
    subtitle: "Browser-based pixel-art RPG",
    summary: "A browser-based pixel-art RPG — still in planning.",
    description: ["A browser-based pixel-art RPG. Currently in the planning stage — more to come."],
    role: "Solo developer",
    status: "planning",
    year: "2026",
    stack: ["TypeScript", "Canvas API"],
    thumbnail: {
      alt: "Vahlorun placeholder art",
      placeholder: { kind: "gradient", seed: "vahlorun", from: "#161622", to: "#4f7cff" },
    },
    links: [
      { label: "GitHub profile", href: "https://github.com/McLector", kind: "repo" },
    ],
    featured: false,
  },
];
