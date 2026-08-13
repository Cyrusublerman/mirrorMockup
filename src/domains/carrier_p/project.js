import { homographyFromPoints, invertHomography, applyHomography } from "../../shared_math/homography.js";
import { area, convex, winding } from "../../shared_math/polygon.js";
import { projectWorld } from "../visibility/report.js";
import { reflectPoint } from "../reflection/reflect.js";
import { finiteApertureTest } from "../reflection/reflect.js";
import { t } from "../../../fixtures/tolerances.js";

const CANONICAL = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

export function evaluateCarrierP(phone, cam, mirror) {
  const reasons = [];
  const reflected = phone.screen_corners_world.map((c) =>
    reflectPoint(c, mirror.centre, mirror.basis.n),
  );
  const capture = [];
  const finalQ = [];
  for (let i = 0; i < 4; i++) {
    const ap = finiteApertureTest(reflected[i], cam.world.translation, mirror);
    if (!ap.visible) reasons.push(`corner_${i}_aperture`);
    const pr = projectWorld(reflected[i], cam);
    if (!pr.valid || pr.depth <= 0) reasons.push(`corner_${i}_depth`);
    capture.push(pr.image_norm_capture || pr.image_norm);
    finalQ.push(pr.image_norm);
  }
  if (capture.some((p) => !p) || finalQ.some((p) => !p)) {
    return { quad: finalQ, quad_capture: capture, valid: false, reasons, homography: null, condition: Infinity };
  }
  const aCap = area(capture);
  const aFin = area(finalQ);
  if (Math.abs(aCap) < 1e-10) reasons.push("zero_area");
  if (!convex(capture)) reasons.push("nonconvex");
  const H = homographyFromPoints(CANONICAL, finalQ);
  const inv = H ? invertHomography(H) : { H: null, condition: Infinity };
  if (!H || !inv.H) reasons.push("homography");
  if (inv.condition > t("T-HOMO")) reasons.push("ill_conditioned");
  const valid = reasons.length === 0;
  return {
    quad: finalQ,
    quad_capture: capture,
    quad_world: reflected,
    valid,
    reasons,
    homography: H,
    inverse: inv.H,
    condition: inv.condition,
    area: aFin,
    area_capture: aCap,
    R_P: Math.abs(aCap),
    winding: winding(finalQ),
  };
}

export function rectifyToCanonical(imagePoint, inverseH) {
  if (!inverseH) return null;
  return applyHomography(inverseH, imagePoint);
}
