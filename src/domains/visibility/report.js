import { sub, length } from "../../shared_math/vector.js";
import { finiteApertureTest, reflectPoint } from "../reflection/reflect.js";
import { pinholeProject, imageNormFromPx } from "../../shared_math/projection.js";
import { captureToFinal } from "../camera/crop.js";
import { segmentTriangle } from "../../shared_math/intersection.js";
import { transformPoint } from "../../shared_math/transform.js";

export function projectWorld(X, cam) {
  const p = pinholeProject(
    X,
    cam.world.translation,
    cam.basis.right,
    cam.basis.up,
    cam.basis.forward,
    cam.fx,
    cam.fy,
    cam.cx,
    cam.cy,
  );
  if (!p.valid) return { ...p, image_norm: null, image_norm_capture: null };
  const n = imageNormFromPx(p.u, p.v, cam.width_px, cam.height_px);
  const capture = [n[0], 1 - n[1]];
  const crop = cam.crop_request;
  return {
    ...p,
    image_norm_capture: capture,
    image_norm: crop ? captureToFinal(capture, crop) : capture,
  };
}

export function reflectedVisibility(X, cam, mirror) {
  const Xr = reflectPoint(X, mirror.centre, mirror.basis.n);
  const ap = finiteApertureTest(Xr, cam.world.translation, mirror);
  const proj = projectWorld(Xr, cam);
  return {
    world_reflected: Xr,
    aperture: ap,
    projection: proj,
    visible: ap.visible && proj.valid,
  };
}

export function disjointIntervals(flags) {
  const intervals = [];
  let start = null;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] && start === null) start = i;
    if (!flags[i] && start !== null) {
      intervals.push([start, i - 1]);
      start = null;
    }
  }
  if (start !== null) intervals.push([start, flags.length - 1]);
  return intervals;
}

export function sameAnatomyScale(sizeR, sizeD) {
  if (Math.abs(sizeD) < 1e-12) return null;
  return sizeR / sizeD;
}

function fkTranslation(p) {
  if (Array.isArray(p) && p.length === 3 && typeof p[0] === "number" && typeof p[1] === "number" && typeof p[2] === "number") {
    return p;
  }
  return null;
}

export function occludesSegment(origin, target, mesh, worldXf) {
  if (!mesh?.positions || !mesh?.triangles) return false;
  const pts = mesh.positions.map((p) => transformPoint(worldXf, p));
  const dirLen = length(sub(target, origin));
  if (dirLen < 1e-9) return false;
  for (const tri of mesh.triangles) {
    const hit = segmentTriangle(origin, target, pts[tri[0]], pts[tri[1]], pts[tri[2]]);
    if (hit && hit.t > 1e-3 && hit.t < 0.999) return true;
  }
  return false;
}

export function evaluateVisibility(fk, cam, mirror, occluders = []) {
  const reports = {};
  const C = cam.world.translation;
  for (const [name, p] of Object.entries(fk)) {
    const X = fkTranslation(p);
    if (!X) continue;
    const reflected = reflectedVisibility(X, cam, mirror);
    let occluded = false;
    const hitPt = reflected.world_reflected;
    for (const occ of occluders) {
      if (!occ?.mesh || !occ?.world) continue;
      if (occludesSegment(C, hitPt, occ.mesh, occ.world)) {
        occluded = true;
        break;
      }
    }
    const vis = reflected.visible && !occluded;
    reports[name] = {
      direct: projectWorld(X, cam),
      reflected: { ...reflected, occluded, visible: vis },
    };
  }
  const armFlags = ["shoulder_R", "elbow_R", "wrist_R"].map((n) => !!reports[n]?.reflected?.visible);
  return {
    reports,
    occlusion: { hand_phone_body: occluders.length > 0 },
    disjoint: { arm_R: disjointIntervals(armFlags) },
  };
}
