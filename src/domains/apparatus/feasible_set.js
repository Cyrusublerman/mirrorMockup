import { add, cross, distance, dot, length, normalize, scale, sub } from "../../shared_math/vector.js";
import { reflectPoint } from "../reflection/reflect.js";
import { PANELS_AI } from "../../../fixtures/reference/panels_ai.js";
import { t } from "../../../fixtures/tolerances.js";
import { DEC } from "../../../fixtures/decisions.js";

export const HEAD_RADIUS_M = DEC["DEC-R"].value;
export const E_FLOOR_M = t("T-FEA-E");
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

  lateralDir(face, camera, n) {
    const along = dot(sub(camera, face), n);
    let lat = sub(sub(camera, face), scale(n, along));
    if (length(lat) < 1e-6) lat = Math.abs(n[2]) < 0.9 ? cross(n, [0, 0, 1]) : cross(n, [1, 0, 0]);
    return normalize(lat);
  }

  minMirrorDistance(row) {
    const r = row.r || HEAD_RADIUS_M;
    const e = Math.max(row.e, E_FLOOR_M + 0.01);
    if (e <= r + 1e-6) return row.m;
    return row.a / (2 * (e / r - 1)) + 0.02;
  }

  projectPhone(translation, face, camera, n, row) {
    if (row.inside) return translation.slice();
    const need = Math.max(row.eclipseLimit, E_FLOOR_M) - row.e + 0.006;
    if (!(need > 0)) return translation.slice();
    return add(translation, scale(this.lateralDir(face, camera, n), need));
  }

  project(translation, d_M, face, camera, n, row) {
    if (row.inside) return { translation: translation.slice(), d_M, moved: false };
    const dir = this.lateralDir(face, camera, n);
    let nextT = translation.slice();
    let nextD = d_M;
    if (row.e < E_FLOOR_M) {
      nextT = add(translation, scale(dir, E_FLOOR_M - row.e + 0.004));
    }
    const eUse = Math.max(row.e, E_FLOOR_M);
    const r = row.r || HEAD_RADIUS_M;
    if (eUse > r + 1e-6) {
      const mMin = row.a / (2 * (eUse / r - 1)) + 0.01;
      if (row.m < mMin) nextD = d_M + (mMin - row.m);
    } else {
      nextT = this.projectPhone(translation, face, camera, n, row);
    }
    return { translation: nextT, d_M: nextD, moved: true };
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
