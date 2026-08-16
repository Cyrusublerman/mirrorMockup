import { INTENT } from "../visibility/occlusion_intent.js";

const base = (headMin, legsMin) => ({
  reflected_head: { state: INTENT.REQUIRED, min: headMin, allowed_occluders: ["direct_hair", "direct_arm"] },
  reflected_torso: { state: INTENT.PERMITTED, allowed_occluders: ["direct_hair", "direct_face", "direct_arm"] },
  reflected_legs: { state: INTENT.REQUIRED, min: legsMin, allowed_occluders: ["direct_body"] },
  reflected_phone: { state: INTENT.REQUIRED, min: 0.01, allowed_occluders: ["direct_hair", "direct_arm"] },
  direct_face: { state: INTENT.PROHIBITED, max: 0 },
});

export const FAMILIES = Object.freeze({
  "direct-dominant": { occlusion_intent: base(0.5, 0.2) },
  "mirror-dominant": { occlusion_intent: base(0.5, 0.3) },
  balanced: { occlusion_intent: base(0.4, 0.3) },
});

export function familyIntent(name) {
  return structuredClone((FAMILIES[name] || FAMILIES["direct-dominant"]).occlusion_intent);
}

export function familyOfPanel(id) {
  if (["B", "E", "F"].includes(id)) return "mirror-dominant";
  if (id === "D") return "balanced";
  return "direct-dominant";
}
