import { add, dot, scale, sub } from "./vector.js";

export function rayPlane(origin, dir, point, normal) {
  const denom = dot(dir, normal);
  if (Math.abs(denom) < 1e-12) return null;
  const t = dot(sub(point, origin), normal) / denom;
  if (t < 1e-9) return null;
  return { t, point: add(origin, scale(dir, t)) };
}

export function segmentTriangle(a, b, t0, t1, t2) {
  const dir = sub(b, a);
  const e1 = sub(t1, t0);
  const e2 = sub(t2, t0);
  const p = [
    dir[1] * e2[2] - dir[2] * e2[1],
    dir[2] * e2[0] - dir[0] * e2[2],
    dir[0] * e2[1] - dir[1] * e2[0],
  ];
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const tv = sub(a, t0);
  const u = dot(tv, p) * inv;
  if (u < 0 || u > 1) return null;
  const q = [
    tv[1] * e1[2] - tv[2] * e1[1],
    tv[2] * e1[0] - tv[0] * e1[2],
    tv[0] * e1[1] - tv[1] * e1[0],
  ];
  const v = dot(dir, q) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = dot(e2, q) * inv;
  if (t < 0 || t > 1) return null;
  return { t, u, v, point: add(a, scale(dir, t)) };
}

export function pointInAabb(p, min, max) {
  return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1] && p[2] >= min[2] && p[2] <= max[2];
}
