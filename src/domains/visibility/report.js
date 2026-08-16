import { sub, length } from "../../shared_math/vector.js";
import { finiteApertureTest, reflectPoint } from "../reflection/reflect.js";
import { ReflectionRay } from "./reflection_ray.js";
import { pinholeProject, imageNormFromPx } from "../../shared_math/projection.js";
import { captureToFinal } from "../camera/crop.js";
import { segmentTriangle } from "../../shared_math/intersection.js";
import { transformPoint } from "../../shared_math/transform.js";

const ray = new ReflectionRay();

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
  if (Array.isArray(p) && p.length === 3 && typeof p[0] === "number" && typeof p[1] === "number" && typeof p[2] === "number") return p;
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

function inFrame(uv) {
  return !!(uv && uv[0] >= 0 && uv[0] <= 1 && uv[1] >= 0 && uv[1] <= 1);
}

function regionFraction(reports, names, space) {
  let visible = 0;
  let n = 0;
  for (const name of names) {
    const row = reports[name];
    if (!row) continue;
    n++;
    if (space === "reflected") {
      if (row.reflected?.visible && inFrame(row.reflected?.projection?.image_norm)) visible++;
    } else if (row.direct?.valid && inFrame(row.direct?.image_norm)) visible++;
  }
  return n ? visible / n : 0;
}

export function evaluateVisibility(fk, cam, mirror, occluders = []) {
  const reports = {};
  const C = cam.world.translation;
  for (const [name, p] of Object.entries(fk)) {
    const X = fkTranslation(p);
    if (!X) continue;
    const traced = ray.trace(X, C, mirror, occluders, occludesSegment);
    const reflected = reflectedVisibility(X, cam, mirror);
    reports[name] = {
      direct: projectWorld(X, cam),
      reflected: {
        ...reflected,
        ...traced,
        occluded: traced.state === "OCCLUDED_CAMERA_TO_MIRROR" || traced.state === "OCCLUDED_MIRROR_TO_TARGET",
        visible: traced.visible,
      },
    };
  }
  const armFlags = ["shoulder_R", "elbow_R", "wrist_R"].map((n) => !!reports[n]?.reflected?.visible);
  const fractions = {
    reflected_head: regionFraction(reports, ["head", "neck"], "reflected"),
    reflected_torso: regionFraction(reports, ["ribcage", "pelvis", "shoulder_L", "shoulder_R", "hip_L", "hip_R"], "reflected"),
    reflected_legs: regionFraction(reports, ["hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R"], "reflected"),
    direct_face: regionFraction(reports, ["head", "neck"], "direct"),
  };
  return {
    reports,
    fractions,
    occlusion: { hand_phone_body: occluders.length > 0 },
    disjoint: { arm_R: disjointIntervals(armFlags) },
  };
}
