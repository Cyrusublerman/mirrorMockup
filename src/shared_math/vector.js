const EPS = 1e-12;

export function vec3(x = 0, y = 0, z = 0) {
  return [x, y, z];
}

export function copy(a) {
  return [a[0], a[1], a[2]];
}

export function set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function negate(a) {
  return [-a[0], -a[1], -a[2]];
}

export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

export function lengthSq(a) {
  return dot(a, a);
}

export function normalize(a) {
  const L = length(a);
  if (L < EPS) return [0, 0, 0];
  return scale(a, 1 / L);
}

export function distance(a, b) {
  return length(sub(a, b));
}

export function lerp(a, b, t) {
  return add(scale(a, 1 - t), scale(b, t));
}

export function equal(a, b, eps = 1e-9) {
  return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps;
}

export function orthonormalFrame(forward, upHint = [0, 0, 1]) {
  const f = normalize(forward);
  let up = upHint;
  if (Math.abs(dot(f, up)) > 0.999) up = Math.abs(f[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const r = normalize(cross(up, f));
  const u = cross(f, r);
  return { right: r, up: u, forward: f };
}

export const AXIS_X = [1, 0, 0];
export const AXIS_Y = [0, 1, 0];
export const AXIS_Z = [0, 0, 1];
export { EPS };
