export const INTENT = Object.freeze({
  REQUIRED: "REQUIRED",
  PERMITTED: "PERMITTED",
  PROHIBITED: "PROHIBITED",
  IGNORE: "IGNORE",
  TARGET: "TARGET",
});

export const DEFAULT_OCCLUSION_INTENT = Object.freeze({
  reflected_head: { state: INTENT.REQUIRED, min: 0.5, allowed_occluders: ["direct_hair", "direct_arm"] },
  reflected_torso: { state: INTENT.PERMITTED, allowed_occluders: ["direct_hair", "direct_face", "direct_arm"] },
  reflected_legs: { state: INTENT.REQUIRED, min: 0.2, allowed_occluders: ["direct_body"] },
  reflected_phone: { state: INTENT.REQUIRED, min: 0.01, allowed_occluders: ["direct_hair", "direct_arm"] },
  direct_face: { state: INTENT.PROHIBITED, max: 0 },
});

function normaliseMeasured(value) {
  if (value && typeof value === "object") {
    return {
      fraction: Math.max(0, Math.min(1, Number(value.fraction ?? value.visible_fraction ?? 0))),
      occluders: Array.isArray(value.occluders) ? value.occluders.slice() : [],
    };
  }
  return { fraction: Math.max(0, Math.min(1, Number(value ?? 0))), occluders: [] };
}

export class OcclusionIntent {
  constructor(spec = null) {
    this.spec = structuredClone(spec || DEFAULT_OCCLUSION_INTENT);
  }

  evaluate(measured = {}) {
    const parts = {};
    const violations = [];
    for (const [id, rule] of Object.entries(this.spec)) {
      const m = normaliseMeasured(measured[id]);
      const frac = m.fraction;
      const state = rule.state;
      let ok = true;
      let reason = "";
      if (state === INTENT.REQUIRED && frac < (rule.min ?? 0.5)) { ok = false; reason = "REQUIRED under"; }
      if (state === INTENT.PROHIBITED && frac > (rule.max ?? 0)) { ok = false; reason = "PROHIBITED present"; }
      if (state === INTENT.TARGET && rule.min != null && frac < rule.min) { ok = false; reason = "TARGET under"; }
      if (state === INTENT.TARGET && rule.max != null && frac > rule.max) { ok = false; reason = "TARGET over"; }
      const disallowed = m.occluders.filter((name) => rule.allowed_occluders?.length && !rule.allowed_occluders.includes(name));
      if (disallowed.length && state !== INTENT.IGNORE) { ok = false; reason = `occluded by ${disallowed.join(",")}`; }
      parts[id] = { state, measured: frac, visible_fraction: frac, min: rule.min, max: rule.max, allowed_occluders: rule.allowed_occluders || [], occluders: m.occluders, ok, reason };
      if (!ok) violations.push(id);
    }
    return { parts, violations, ok: violations.length === 0 };
  }
}
