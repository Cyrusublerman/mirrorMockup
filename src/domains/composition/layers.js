import { centroid } from "../../shared_math/polygon.js";
import { homographyFromPoints, applyHomography } from "../../shared_math/homography.js";

const U = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

export function layerL0(cam) {
  const o = [cam.cx / cam.width_px, 1 - cam.cy / cam.height_px];
  return {
    id: "L0",
    role: "direct_artwork",
    omega: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    principal: o,
  };
}

export function layerL1(mirrorImageQuad) {
  const quad = (mirrorImageQuad || []).filter((p) => p && Number.isFinite(p[0]));
  return {
    id: "L1",
    role: "mirror_reflected",
    omega: quad.length === 4 ? quad : null,
    principal: quad.length === 4 ? centroid(quad) : null,
  };
}

export function layerL2(carrierP) {
  const quad = carrierP?.quad;
  const ok = quad && quad.length === 4 && quad.every((p) => p && Number.isFinite(p[0]));
  return {
    id: "L2",
    role: "phone_preview",
    omega: ok ? quad : null,
    principal: ok ? centroid(quad) : null,
    p_T: ok ? centroid(quad) : null,
  };
}

export function rectifyToU(quad) {
  if (!quad || quad.length !== 4) return null;
  return homographyFromPoints(quad, U);
}

export function applyC(C, p) {
  if (!C || !p) return null;
  return applyHomography(C, p);
}

export function transitionResidual(C_a, quadA, C_b, quadB) {
  if (!C_a || !C_b || !quadA || !quadB) return null;
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const ua = applyC(C_a, quadA[i]);
    const ub = applyC(C_b, quadB[i]);
    if (!ua || !ub) return null;
    s += Math.hypot(ua[0] - U[i][0], ua[1] - U[i][1]) + Math.hypot(ub[0] - U[i][0], ub[1] - U[i][1]);
  }
  return s / 8;
}

export function evaluateLayers(cam, mirrorImageQuad, carrierP, recursion) {
  const L0 = layerL0(cam);
  const L1 = layerL1(mirrorImageQuad);
  const L2 = layerL2(carrierP);
  const C0 = rectifyToU(L0.omega);
  const C1 = L1.omega ? rectifyToU(L1.omega) : null;
  const C2 = L2.omega ? rectifyToU(L2.omega) : null;
  const T01 = transitionResidual(C0, L0.omega, C1, L1.omega);
  const T12 = transitionResidual(C1, L1.omega, C2, L2.omega);
  const p_W = recursion?.certificate?.pole || null;
  const O = L0.principal;
  const p_T = L2.p_T;
  return {
    L0,
    L1,
    L2,
    C0,
    C1,
    C2,
    T01,
    T12,
    T01_T12_residual: T01 != null && T12 != null ? Math.abs(T01 - T12) : null,
    O,
    p_T,
    p_W,
    distinct: {
      L0_L1: L0.id !== L1.id,
      L1_L2: L1.id !== L2.id,
      named_O: O,
      named_p_T: p_T,
      named_p_W: p_W,
    },
  };
}
