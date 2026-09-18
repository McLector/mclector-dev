import type { Certification } from "./types";

/**
 * Ships empty in v1. The certifications card must render a designed empty
 * state at 0 items (see docs/contracts.md and features/certifications/**).
 * Adding a certification later is a one-line push to this array — no
 * component changes required.
 */
export const certifications: Certification[] = [];
