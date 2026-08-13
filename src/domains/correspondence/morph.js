import { distance } from "../../shared_math/vector.js";

export function validateMorph(src, dst) {
  if (!src || !dst || src.length !== dst.length || src.length < 3) {
    return { valid: false, reason: "INSUFFICIENT_CORRESPONDENCE" };
  }
  let max = 0;
  for (let i = 0; i < src.length; i++) max = Math.max(max, distance(src[i], dst[i]));
  return { valid: true, residual: max, reason: null };
}

export function evaluateCorrespondence(requested, layers) {
  const pairs = requested.correspondence?.pairs || [];
  const src = pairs.map((p) => p.src);
  const dst = pairs.map((p) => p.dst);
  const geom = pairs.length ? validateMorph(src, dst) : { valid: true, residual: 0, reason: "EMPTY" };
  return {
    pairs,
    geometric: geom,
    blend_allowed: !!geom.valid,
    L0: layers?.L0?.id || "L0",
    L1: layers?.L1?.id || "L1",
    L2: layers?.L2?.id || "L2",
  };
}
