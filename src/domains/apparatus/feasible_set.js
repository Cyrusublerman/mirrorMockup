import { add, distance, dot, length, normalize, scale, sub } from "../../shared_math/vector.js";
import { reflectPoint } from "../reflection/reflect.js";
import { PANELS_AI } from "../../../fixtures/reference/panels_ai.js";

export const HEAD_RADIUS_M = 0.115;
export const E_FLOOR_M = 0.13;
export const CROSS_BODY_COST_M = 0.07;

export class FeasibleSet {
  evaluate({
    face,
    camera,
    mirrorCentre,
    mirrorNormal,
    shoulder,
    handedness = "right",
    r = HEAD_RADIUS_M,
  }) {
    if (!face || !camera || !mirrorCentre || !mirrorNormal) {
      return { inside: false, reasons: ["missing_geometry"], distance_to_boundary: Infinity };
    }
    const n = normalize(mirrorNormal);
    const m = Math.abs(dot(sub(face, mirrorCentre), n));
    const c = Math.abs(dot(sub(camera, mirrorCentre), n));
    const u = c - m;
    const a = distance(camera, face);
    const along = dot(sub(camera, face), n);
    const e = length(sub(sub(camera, face), scale(n, along)));
    const faceR = reflectPoint(face, mirrorCentre, n);
    const R = a > 1e-9 ? distance(camera, faceR) / a : Infinity;
    const toFace = sub(face, camera);
    const toFaceR = sub(faceR, camera);
    const denom = length(toFace) * length(toFaceR);
    const cosSig = denom > 1e-12 ? Math.min(1, Math.max(-1, dot(toFace, toFaceR) / denom)) : 1;
    const sigma = Math.acos(cosSig);
    const asinArg = a > 1e-9 ? Math.min(1, r / a) : 1;
    const clearance = sigma - Math.asin(asinArg);
    const eclipseLimit = (1 + a / Math.max(2 * m, 1e-6)) * r;
    const eclipsed = e < eclipseLimit;
    const eFloor = e < E_FLOOR_M;
    const reach = shoulder ? distance(shoulder, camera) : a;
    const faceLateral = sub(sub(camera, face), scale(n, along));
    const shoulderLateral = shoulder
      ? sub(sub(shoulder, face), scale(n, dot(sub(shoulder, face), n)))
      : null;
    const crossed = !!(shoulderLateral && dot(faceLateral, shoulderLateral) < 0);
    const reachLimit = 0.63 - (crossed ? CROSS_BODY_COST_M : 0);
    const beyondReach = reach > reachLimit;
    const reasons = [];
    if (eclipsed) reasons.push("direct_head_eclipse");
    if (eFloor) reasons.push("e_floor");
    if (beyondReach) reasons.push("beyond_reach");
    if (crossed) reasons.push("cross_body");
    const gaps = [
      e - eclipseLimit,
      e - E_FLOOR_M,
      reachLimit - reach,
    ];
    const distance_to_boundary = Math.min(...gaps);
    return {
      m,
      u,
      c,
      a,
      e,
      R,
      sigma,
      clearance,
      r,
      eclipseLimit,
      eclipsed,
      crossed,
      handedness,
      reach,
      reachLimit,
      inside: reasons.length === 0,
      reasons,
      distance_to_boundary,
      binding: reasons[0] || null,
    };
  }

  referenceDots() {
    return Object.entries(PANELS_AI).map(([id, row]) => ({
      id,
      a: row.a_m,
      e: row.e_m,
      regime: row.regime,
      occupancy: {
        mirror: row.mirror,
        direct_body: row.direct_body,
        reflected_body: row.reflected_body,
      },
      epistemic: row.ae_epistemic,
    }));
  }
}
