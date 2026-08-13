import { add, scale, normalize, negate } from "../../shared_math/vector.js";
import * as quat from "../../shared_math/quaternion.js";

export function apparatusFrameFromCamera(cam) {
  const f = cam.basis.forward;
  const r = cam.basis.right;
  const u = cam.basis.up;
  return { origin: cam.world.translation, right: r, up: u, forward: f };
}

export function mirrorCentre(frame, d_M, pan_uv) {
  return add(add(add(frame.origin, scale(frame.forward, d_M)), scale(frame.right, pan_uv[0])), scale(frame.up, pan_uv[1]));
}

export function productionMirrorBasis(frame) {
  return {
    u: frame.right.slice(),
    v: frame.up.slice(),
    n: negate(frame.forward),
  };
}

export function evaluateApparatus(cam, requested) {
  const frame = apparatusFrameFromCamera(cam);
  const d_M = requested.apparatus.mirror_distance_request_m;
  const pan = requested.apparatus.mirror_pan_uv_request_m || [0, 0];
  const centre = mirrorCentre(frame, d_M, pan);
  const basis = productionMirrorBasis(frame);
  const parallel = Math.abs(
    basis.n[0] * frame.forward[0] + basis.n[1] * frame.forward[1] + basis.n[2] * frame.forward[2] + 1,
  );
  return {
    frame,
    d_M,
    pan_uv: pan.slice(),
    centre,
    basis,
    rotation_relation: "PARALLEL_TO_PHONE",
    parallel_residual: parallel,
  };
}

export function autosolveDistance(current_d, targetRatio, measuredRatio, gain = 0.5) {
  if (measuredRatio <= 1e-12) return current_d;
  const scale = Math.sqrt(measuredRatio / Math.max(targetRatio, 1e-12));
  const next = current_d * (1 + gain * (scale - 1));
  return Math.max(0.2, Math.min(8, next));
}
