export const INTENT = Object.freeze({
  REQUIRED: "REQUIRED",
  PERMITTED: "PERMITTED",
  PROHIBITED: "PROHIBITED",
  IGNORE: "IGNORE",
  TARGET: "TARGET",
});

export const DEFAULT_OCCLUSION_INTENT = Object.freeze({
  reflected_head: { state: INTENT.REQUIRED, min: 0.5 },
  reflected_torso: { state: INTENT.PERMITTED },
  reflected_legs: { state: INTENT.REQUIRED, min: 0.2 },
  reflected_phone: { state: INTENT.REQUIRED, min: 0.01 },
  direct_face: { state: INTENT.PERMITTED },
});

export class OcclusionIntent {
  constructor(spec = DEFAULT_OCCLUSION_INTENT) {
    this.spec = { ...DEFAULT_OCCLUSION_INTENT, ...spec };
  }

  evaluate(measured = {}) {
    const parts = {};
    const violations = [];
    for (const [id, rule] of Object.entries(this.spec)) {
      const frac = Number(measured[id] ?? 0);
      const state = rule.state;
      let ok = true;
      if (state === INTENT.REQUIRED && frac < (rule.min ?? 0.5)) ok = false;
      if (state === INTENT.PROHIBITED && frac > (rule.max ?? 0)) ok = false;
      if (state === INTENT.TARGET && rule.min != null && frac < rule.min) ok = false;
      if (state === INTENT.TARGET && rule.max != null && frac > rule.max) ok = false;
      parts[id] = { state, measured: frac, ok };
      if (!ok) violations.push(id);
    }
    return { parts, violations, ok: violations.length === 0 };
  }
}
