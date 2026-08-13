import { homographyFromPoints, invertHomography, applyHomography } from "../../shared_math/homography.js";
import { area, convex, winding } from "../../shared_math/polygon.js";
import { projectWorld } from "../visibility/report.js";
import { reflectPoint } from "../reflection/reflect.js";
import { finiteApertureTest } from "../reflection/reflect.js";

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
  const projected = [];
  for (let i = 0; i < 4; i++) {
    const ap = finiteApertureTest(reflected[i], cam.world.translation, mirror);
    if (!ap.visible) reasons.push(`corner_${i}_aperture`);
    const pr = projectWorld(reflected[i], cam);
    if (!pr.valid || pr.depth <= 0) reasons.push(`corner_${i}_depth`);
    projected.push(pr.image_norm);
  }
  if (projected.some((p) => !p)) {
    return { quad: projected, valid: false, reasons, homography: null, condition: Infinity };
  }
  const a = area(projected);
  if (Math.abs(a) < 1e-10) reasons.push("zero_area");
  if (!convex(projected)) reasons.push("nonconvex");
  const H = homographyFromPoints(CANONICAL, projected);
  const inv = H ? invertHomography(H) : { H: null, condition: Infinity };
  if (!H || !inv.H) reasons.push("homography");
  if (inv.condition > 1e8) reasons.push("ill_conditioned");
  const valid = reasons.length === 0;
  return {
    quad: projected,
    quad_world: reflected,
    valid,
    reasons,
    homography: H,
    inverse: inv.H,
    condition: inv.condition,
    area: a,
    winding: winding(projected),
  };
}

export function rectifyToCanonical(imagePoint, inverseH) {
  if (!inverseH) return null;
  return applyHomography(inverseH, imagePoint);
}
