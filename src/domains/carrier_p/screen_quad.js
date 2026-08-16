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
    const gates_ok = gate_reasons.length === 0;
    const reasons = [...(base.reasons || []), ...gate_reasons.map((r) => `gate_${r}`)];
    return {
      ...base,
      gates,
      gates_ok,
      gate_reasons,
      valid: !!base.valid && gates_ok,
      reasons,
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
    const cos = Math.abs(dot(normalize(n), view));
    const limit = Math.cos((t("T-PQ-ANGLE") * Math.PI) / 180);
    return { ok: cos >= limit, value: cos, limit };
  }

  footprintGate(base, widthPx, heightPx) {
    const a = Math.abs(base.area_capture ?? 0);
    const px = a * widthPx * heightPx;
    const minPx = t("T-PQ-PX");
    return { ok: px >= minPx, value: px, limit: minPx };
  }

  conditioningGate(base) {
    const cond = base.condition ?? Infinity;
    const limit = t("T-HOMO");
    return { ok: Number.isFinite(cond) && cond <= limit && !(base.reasons || []).includes("ill_conditioned"), value: cond, limit };
  }

  occlusionGate(base, occluded) {
    const apertureFail = (base.reasons || []).some((r) => String(r).includes("aperture"));
    return { ok: !occluded && !apertureFail, value: occluded ? 1 : 0 };
  }

  bezelGate(base, phone) {
    const inset = phone?.screen_inset || {};
    const vals = [inset.left, inset.right, inset.top, inset.bottom].filter(Number.isFinite);
    const minInset = vals.length ? Math.min(...vals) : 0;
    // S_i are already the physical screen corners inset from the phone body. The
    // bezel gate therefore tests that the physical inset exists; framing belongs
    // to the footprint/crop system, not to bezel validity.
    const ok = !!base.quad && base.quad.every((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1])) && minInset > 1e-4;
    return { ok, value: minInset, limit: 1e-4 };
  }
}

export { GATES as SCREEN_GATES };
