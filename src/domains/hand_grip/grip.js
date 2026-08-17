import { transformPoint } from "../../shared_math/transform.js";

const DEFAULT_PALM_LOCAL = [0, -0.02, -0.01];

function isZeroOffset(offset) {
  return !offset || (offset[0] === 0 && offset[1] === 0 && offset[2] === 0);
}

function clipAgainst(poly, inside, intersect) {
  if (!poly.length) return [];
  const out = [];
  let a = poly[poly.length - 1];
  let aIn = inside(a);
  for (const b of poly) {
    const bIn = inside(b);
    if (bIn) {
      if (!aIn) out.push(intersect(a, b));
      out.push(b);
    } else if (aIn) out.push(intersect(a, b));
    a = b;
    aIn = bIn;
  }
  return out;
}

function clipUnit(poly) {
  let p = (poly || [])
    .filter((v) => Array.isArray(v) && v.length >= 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]))
    .map((v) => [v[0], v[1]]);
  const xCross = (x) => (a, b) => {
    const d = b[0] - a[0];
    const u = Math.abs(d) < 1e-12 ? 0 : (x - a[0]) / d;
    return [x, a[1] + (b[1] - a[1]) * u];
  };
  const yCross = (y) => (a, b) => {
    const d = b[1] - a[1];
    const u = Math.abs(d) < 1e-12 ? 0 : (y - a[1]) / d;
    return [a[0] + (b[0] - a[0]) * u, y];
  };
  p = clipAgainst(p, (v) => v[0] >= 0, xCross(0));
  p = clipAgainst(p, (v) => v[0] <= 1, xCross(1));
  p = clipAgainst(p, (v) => v[1] >= 0, yCross(0));
  p = clipAgainst(p, (v) => v[1] <= 1, yCross(1));
  return p;
}

function polygonArea(poly) {
  if (poly.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) * 0.5;
}

export function screenOcclusionFraction(polygons = []) {
  let total = 0;
  for (const poly of polygons) total += polygonArea(clipUnit(poly));
  return Math.max(0, Math.min(1, total));
}

export function evaluateGrip(phoneEval, requested) {
  const grip_world = phoneEval.grip_world;
  const offset = requested.phone.grip_relation.offset;
  const phoneWorld = phoneEval.world || grip_world;
  const wrist_target = isZeroOffset(offset)
    ? transformPoint(phoneWorld, DEFAULT_PALM_LOCAL)
    : grip_world.translation.slice();
  const screen_occluder_polygons_uv = requested.phone.grip_relation.screen_occluder_polygons_uv || [];
  return {
    authority: requested.phone.authority,
    grip_world,
    wrist_target,
    contacts: ["palm", "index", "middle", "ring", "thumb"],
    screen_occluder_polygons_uv,
    screen_occlusion_fraction: screenOcclusionFraction(screen_occluder_polygons_uv),
  };
}
