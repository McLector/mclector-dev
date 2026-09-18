import type { ThreeElement } from "@react-three/fiber";
import type { MeshLineGeometry, MeshLineMaterial } from "meshline";

/**
 * `meshline` ships plain three.js classes, not r3f components. `extend()` in
 * LanyardScene.tsx registers them with the reconciler at runtime; this
 * augmentation is what tells TypeScript that `<meshLineGeometry />` and
 * `<meshLineMaterial />` are now valid intrinsic elements.
 *
 * Note this is `ThreeElements` (r3f v9), not the v8-era `ReactThreeFiber`
 * namespace under `JSX.IntrinsicElements`.
 */
declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

export {};
