import { INTENT } from "../visibility/occlusion_intent.js";

export const FAMILIES = Object.freeze({
  "direct-dominant": {
    occlusion_intent: {
      reflected_head: { state: INTENT.REQUIRED, min: 0.5 },
      reflected_torso: { state: INTENT.PERMITTED },
      reflected_legs: { state: INTENT.REQUIRED, min: 0.2 },
      reflected_phone: { state: INTENT.REQUIRED, min: 0.01 },
      direct_face: { state: INTENT.PERMITTED },
    },
  },
  "mirror-dominant": {
    occlusion_intent: {
      reflected_head: { state: INTENT.REQUIRED, min: 0.5 },
      reflected_torso: { state: INTENT.PERMITTED },
      reflected_legs: { state: INTENT.REQUIRED, min: 0.3 },
      reflected_phone: { state: INTENT.REQUIRED, min: 0.01 },
      direct_face: { state: INTENT.IGNORE },
    },
  },
  balanced: {
    occlusion_intent: {
      reflected_head: { state: INTENT.REQUIRED, min: 0.4 },
      reflected_torso: { state: INTENT.PERMITTED },
      reflected_legs: { state: INTENT.REQUIRED, min: 0.3 },
      reflected_phone: { state: INTENT.REQUIRED, min: 0.01 },
      direct_face: { state: INTENT.PERMITTED },
    },
  },
});

export function familyIntent(name) {
  return structuredClone((FAMILIES[name] || FAMILIES["direct-dominant"]).occlusion_intent);
}

export function familyOfPanel(id) {
  if ("BEFG".includes(id) && id !== "G") return "mirror-dominant";
  if (id === "D") return "balanced";
  return "direct-dominant";
}
