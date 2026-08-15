import { dot, sub } from "../../shared_math/vector.js";

export const PART_SPANS = Object.freeze({
  feet: [0.00, 0.08],
  shins: [0.08, 0.28],
  thighs: [0.28, 0.52],
  torso: [0.52, 0.82],
  head: [0.82, 1.00],
});

export class ApertureBand {
  evaluate({ camera, face, mirror, stature = 1.7 }) {
    const C = camera?.world?.translation;
    const n = mirror?.basis?.n;
    const M = mirror?.centre;
    if (!C || !n || !M || !face) {
      return { parts: {}, visible_band: null };
    }
    const p = Math.abs(dot(sub(face, M), n));
    const c = Math.abs(dot(sub(C, M), n));
    const z_c = C[2];
    const denom = c + p;
    const z_r = (z_p) => (p * z_c + c * z_p) / Math.max(denom, 1e-9);
    const required_sill = p * z_c / Math.max(denom, 1e-9);
    const required_height = stature * c / Math.max(denom, 1e-9);
    const half = (mirror.height_m || 0) / 2;
    const actual_sill = M[2] - half;
    const actual_height = mirror.height_m || 0;
    const actual_top = actual_sill + actual_height;
    const parts = {};
    for (const [name, [lo, hi]] of Object.entries(PART_SPANS)) {
      const z0 = lo * stature;
      const z1 = hi * stature;
      const zr0 = z_r(z0);
      const zr1 = z_r(z1);
      const vis0 = Math.max(zr0, actual_sill);
      const vis1 = Math.min(zr1, actual_top);
      const span = Math.max(0, zr1 - zr0);
      const visible = span > 1e-9 ? Math.max(0, vis1 - vis0) / span : 0;
      parts[name] = { z0, z1, zr0, zr1, visible };
    }
    const cut = Math.max(0, actual_sill - z_r(0));
    return {
      p,
      c,
      z_c,
      z_r_fn: z_r,
      required_sill,
      required_height,
      actual_sill,
      actual_height,
      too_high_by: actual_sill - required_sill,
      sill_sensitivity: p / Math.max(denom, 1e-9),
      visible_band: [Math.max(actual_sill, z_r(0)), Math.min(actual_top, z_r(stature))],
      cut,
      parts,
    };
  }
}
