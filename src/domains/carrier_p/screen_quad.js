import { add, dot, normalize, scale, sub } from "../../shared_math/vector.js";
import { reflectDir } from "../reflection/reflect.js";
import { evaluateCarrierP } from "./project.js";
import { t } from "../../../fixtures/tolerances.js";

const GATES = ["area", "angle", "footprint", "conditioning", "occlusion", "bezel"];

export class ScreenQuad {
  evaluate(phone, cam, mirror, opts = {}) {
    const base = evaluateCarrierP(phone, cam, mirror);
    const widthPx = cam.width_px || opts.width_px || 1170;
    const heightPx = cam.height_px || opts.height_px || 1560;
    const gates = {
      area: this.areaGate(base),
      angle: this.angleGate(phone, cam, mirror, base),
      footprint: this.footprintGate(base, widthPx, heightPx),
      conditioning: this.conditioningGate(base),
      occlusion: this.occlusionGate(base, opts.occluded === true),
      bezel: this.bezelGate(base, phone),
    };
    const gate_reasons = GATES.filter((k) => !gates[k].ok);
    return {
      ...base,
      gates,
      gates_ok: gate_reasons.length === 0,
      gate_reasons,
      valid: base.valid,
      reasons: base.reasons,
      quad: base.quad,
    };
  }

  areaGate(base) {
    const a = Math.abs(base.area_capture ?? base.area ?? 0);
    return { ok: a > 1e-10 && !(base.reasons || []).includes("zero_area") && !(base.reasons || []).includes("nonconvex"), value: a };
  }

  angleGate(phone, cam, mirror, base) {
    const C = cam?.world?.translation;
    const n0 = phone?.screen_normal;
    const nM = mirror?.basis?.n;
    const quad = base.quad_world;
    if (!C || !n0 || !nM || !quad || quad.some((p) => !p)) return { ok: false, value: null };
    const n = reflectDir(n0, nM);
    const c0 = quad.reduce((s, p) => add(s, p), [0, 0, 0]);
    const centroid = scale(c0, 0.25);
    const view = normalize(sub(C, centroid));
    const cos = dot(normalize(n), view);
    const limit = Math.cos((optsAngle() * Math.PI) / 180);
    return { ok: cos >= limit, value: cos };
  }

  footprintGate(base, widthPx, heightPx) {
    const a = Math.abs(base.area_capture ?? 0);
    const px = a * widthPx * heightPx;
    const minPx = t("T-PQ-PX");
    return { ok: px >= minPx, value: px };
  }

  conditioningGate(base) {
    const cond = base.condition ?? Infinity;
    return { ok: Number.isFinite(cond) && cond <= t("T-HOMO") && !(base.reasons || []).includes("ill_conditioned"), value: cond };
  }

  occlusionGate(base, occluded) {
    const apertureFail = (base.reasons || []).some((r) => String(r).includes("aperture"));
    return { ok: !occluded && !apertureFail, value: occluded ? 1 : 0 };
  }

  bezelGate(base, phone) {
    const inset = phone?.screen_inset || {};
    const minIn = Math.min(inset.left ?? 0.003, inset.right ?? 0.003, inset.top ?? 0.004, inset.bottom ?? 0.008);
    const quad = base.quad;
    if (!quad || quad.some((p) => !p)) return { ok: false, value: null };
    const margin = t("T-PQ-BEZEL");
    const inside = quad.every((p) => p[0] >= margin && p[0] <= 1 - margin && p[1] >= margin && p[1] <= 1 - margin);
    return { ok: inside && minIn >= 1e-4, value: minIn };
  }
}

function optsAngle() {
  return t("T-PQ-ANGLE");
}

export function hitScreenCorner(quad, uv, radius = 0.06) {
  if (!quad) return -1;
  let best = -1;
  let bestD = radius;
  for (let i = 0; i < 4; i++) {
    const p = quad[i];
    if (!p) continue;
    const d = Math.hypot(p[0] - uv[0], p[1] - uv[1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export { GATES as SCREEN_GATES };
