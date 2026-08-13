import { cross, dot, normalize as n3, scale, add } from "./vector.js";

const EPS = 1e-12;

export function quat(x = 0, y = 0, z = 0, w = 1) {
  return [x, y, z, w];
}

export function identity() {
  return [0, 0, 0, 1];
}

export function copy(q) {
  return [q[0], q[1], q[2], q[3]];
}

export function normalize(q) {
  const L = Math.hypot(q[0], q[1], q[2], q[3]);
  if (L < EPS) return identity();
  return [q[0] / L, q[1] / L, q[2] / L, q[3] / L];
}

export function multiply(a, b) {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function conjugate(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function invert(q) {
  return normalize(conjugate(q));
}

export function fromAxisAngle(axis, angle) {
  const a = n3(axis);
  const s = Math.sin(angle / 2);
  return normalize([a[0] * s, a[1] * s, a[2] * s, Math.cos(angle / 2)]);
}

export function fromTo(from, to) {
  const f = n3(from);
  const t = n3(to);
  const d = dot(f, t);
  if (d > 1 - 1e-8) return identity();
  if (d < -1 + 1e-8) {
    let ortho = Math.abs(f[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    ortho = n3(cross(f, ortho));
    return fromAxisAngle(ortho, Math.PI);
  }
  const c = cross(f, t);
  return normalize([c[0], c[1], c[2], 1 + d]);
}

export function rotateVec(q, v) {
  const u = [q[0], q[1], q[2]];
  const s = q[3];
  const t = scale(u, 2 * dot(u, v));
  const uxv = scale(cross(u, v), 2 * s);
  const s2 = scale(v, s * s - dot(u, u));
  return add(add(t, uxv), s2);
}

export function slerp(a, b, t) {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cosom = ax * bx + ay * by + az * bz + aw * bw;
  if (cosom < 0) {
    bx = -bx; by = -by; bz = -bz; bw = -bw;
    cosom = -cosom;
  }
  if (cosom > 0.9995) {
    return normalize([
      ax + t * (bx - ax),
      ay + t * (by - ay),
      az + t * (bz - az),
      aw + t * (bw - aw),
    ]);
  }
  const omega = Math.acos(Math.min(1, cosom));
  const so = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / so;
  const s1 = Math.sin(t * omega) / so;
  return [s0 * ax + s1 * bx, s0 * ay + s1 * by, s0 * az + s1 * bz, s0 * aw + s1 * bw];
}

export function toMat3(q) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  return [
    1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy),
    2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx),
    2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy),
  ];
}

export function fromMat3(m) {
  const t = m[0] + m[4] + m[8];
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    return normalize([(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, 0.25 * s]);
  }
  if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    return normalize([0.25 * s, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s]);
  }
  if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    return normalize([(m[1] + m[3]) / s, 0.25 * s, (m[5] + m[7]) / s, (m[2] - m[6]) / s]);
  }
  const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
  return normalize([(m[2] + m[6]) / s, (m[5] + m[7]) / s, 0.25 * s, (m[3] - m[1]) / s]);
}

export function yawPitchRoll(yaw, pitch, roll) {
  const qz = fromAxisAngle([0, 0, 1], yaw);
  const qy = fromAxisAngle([0, 1, 0], pitch);
  const qx = fromAxisAngle([1, 0, 0], roll);
  return multiply(multiply(qz, qy), qx);
}

export function bendTiltTwist(bend, tilt, twist, bendAxis = [1, 0, 0], tiltAxis = [0, 1, 0], twistAxis = [0, 0, 1]) {
  return multiply(multiply(fromAxisAngle(bendAxis, bend), fromAxisAngle(tiltAxis, tilt)), fromAxisAngle(twistAxis, twist));
}
