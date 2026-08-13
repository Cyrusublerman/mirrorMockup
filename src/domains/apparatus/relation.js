import { add, scale, normalize, negate, dot, sub } from "../../shared_math/vector.js";
import { t } from "../../../fixtures/tolerances.js";

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

export function derivedRelation(frame, centre) {
  const d = sub(centre, frame.origin);
  const d_M = dot(d, frame.forward);
  const p_u = dot(d, frame.right);
  const p_v = dot(d, frame.up);
  return { d_M, pan_uv: [p_u, p_v] };
}

export function evaluateApparatus(cam, requested) {
  const frame = apparatusFrameFromCamera(cam);
  const basis = productionMirrorBasis(frame);
  const authority = requested.mirror.frame_authority || "WORLD";
  let centre;
  let d_M;
  let pan;
  if (authority === "WORLD" && requested.mirror.world_pose?.translation) {
    centre = requested.mirror.world_pose.translation.slice();
    let rel = derivedRelation(frame, centre);
    d_M = rel.d_M;
    pan = rel.pan_uv;
    const want = requested.apparatus.mirror_distance_request_m;
    if (requested.apparatus.apply_distance_request && Number.isFinite(want) && Math.abs(want - d_M) > 1e-9) {
      centre = add(centre, scale(frame.forward, want - d_M));
      requested.mirror.world_pose.translation = centre.slice();
      rel = derivedRelation(frame, centre);
      d_M = rel.d_M;
      pan = rel.pan_uv;
    }
    requested.apparatus.apply_distance_request = false;
  } else {
    d_M = requested.apparatus.mirror_distance_request_m;
    pan = requested.apparatus.mirror_pan_uv_request_m || [0, 0];
    centre = mirrorCentre(frame, d_M, pan);
  }
  const parallel = Math.abs(
    basis.n[0] * frame.forward[0] + basis.n[1] * frame.forward[1] + basis.n[2] * frame.forward[2] + 1,
  );
  return {
    frame,
    d_M,
    pan_uv: pan.slice(),
    centre,
    basis,
    frame_authority: authority,
    rotation_relation: "PARALLEL_TO_PHONE",
    parallel_residual: parallel,
    world_pose: { translation: centre.slice(), rotation: requested.mirror.world_pose?.rotation || [0, 0, 0, 1] },
  };
}

export function rootSolveDistance(current_d, targetRatio, measureFn) {
  const [minD, maxD] = t("T-DM-BOUNDS");
  let d = current_d;
  let projected = false;
  let measured = measureFn(d);
  for (let i = 0; i < 12; i++) {
    if (!(measured > 1e-12) || !(targetRatio > 1e-12)) break;
    const ratio = measured / targetRatio;
    if (Math.abs(ratio - 1) < 1e-4) break;
    d = d * Math.sqrt(ratio);
    if (d < minD || d > maxD) {
      d = Math.max(minD, Math.min(maxD, d));
      projected = true;
      measured = measureFn(d);
      break;
    }
    measured = measureFn(d);
  }
  return { d_M: d, measured, projected };
}
