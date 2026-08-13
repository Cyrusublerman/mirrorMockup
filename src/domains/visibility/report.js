import { add, scale, sub, length } from "../../shared_math/vector.js";
import { finiteApertureTest, reflectPoint } from "../reflection/reflect.js";
import { pinholeProject, imageNormFromPx } from "../../shared_math/projection.js";

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
  if (!p.valid) return { ...p, image_norm: null };
  const n = imageNormFromPx(p.u, p.v, cam.width_px, cam.height_px);
  return {
    ...p,
    image_norm: [n[0], 1 - n[1]],
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

export function evaluateVisibility(fk, cam, mirror) {
  const reports = {};
  for (const [name, p] of Object.entries(fk)) {
    const X = fkTranslation(p);
    if (!X) continue;
    reports[name] = {
      direct: projectWorld(X, cam),
      reflected: reflectedVisibility(X, cam, mirror),
    };
  }
  return { reports };
}
