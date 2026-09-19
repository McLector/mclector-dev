import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Self-hosted fonts (no external request): Sora for display/body, Space Mono
// for the "space-console" accents (clock, ID chip, eyebrows). Imported before
// the stylesheet so the @font-face rules exist when the tokens resolve.
import "@fontsource-variable/sora";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
