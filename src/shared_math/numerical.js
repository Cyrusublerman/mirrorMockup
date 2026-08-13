export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function almostEqual(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

export function deg(rad) {
  return (rad * 180) / Math.PI;
}

export function rad(degVal) {
  return (degVal * Math.PI) / 180;
}

export function twoLinkReach(L1, L2, r) {
  const lo = Math.abs(L1 - L2);
  const hi = L1 + L2;
  return { lo, hi, reachable: r >= lo - 1e-9 && r <= hi + 1e-9 };
}

export function twoLinkIk(S, W, L1, L2, planeNormal, branch = 1) {
  const d = [W[0] - S[0], W[1] - S[1], W[2] - S[2]];
  const r = Math.hypot(...d);
  const { lo, hi } = twoLinkReach(L1, L2, r);
  const clamped = Math.min(hi - 1e-9, Math.max(lo + 1e-9, r));
  const dir = r > 1e-12 ? [d[0] / r, d[1] / r, d[2] / r] : [1, 0, 0];
  const Wproj = [
    S[0] + dir[0] * clamped,
    S[1] + dir[1] * clamped,
    S[2] + dir[2] * clamped,
  ];
  const cosA = clamp((L1 * L1 + clamped * clamped - L2 * L2) / (2 * L1 * clamped), -1, 1);
  const alpha = Math.acos(cosA);
  let n = planeNormal;
  const nlen = Math.hypot(...n);
  if (nlen < 1e-8) n = [0, 0, 1];
  else n = [n[0] / nlen, n[1] / nlen, n[2] / nlen];
  let perp = [
    n[1] * dir[2] - n[2] * dir[1],
    n[2] * dir[0] - n[0] * dir[2],
    n[0] * dir[1] - n[1] * dir[0],
  ];
  const plen = Math.hypot(...perp);
  if (plen < 1e-8) {
    const alt = Math.abs(dir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    perp = [
      dir[1] * alt[2] - dir[2] * alt[1],
      dir[2] * alt[0] - dir[0] * alt[2],
      dir[0] * alt[1] - dir[1] * alt[0],
    ];
  }
  const p = [perp[0] / Math.hypot(...perp), perp[1] / Math.hypot(...perp), perp[2] / Math.hypot(...perp)];
  const sign = branch >= 0 ? 1 : -1;
  const E = [
    S[0] + dir[0] * L1 * Math.cos(alpha) + p[0] * L1 * Math.sin(alpha) * sign,
    S[1] + dir[1] * L1 * Math.cos(alpha) + p[1] * L1 * Math.sin(alpha) * sign,
    S[2] + dir[2] * L1 * Math.cos(alpha) + p[2] * L1 * Math.sin(alpha) * sign,
  ];
  return {
    elbow: E,
    wrist: Wproj,
    requested: W,
    residual: Math.hypot(W[0] - Wproj[0], W[1] - Wproj[1], W[2] - Wproj[2]),
    branch: sign,
    projected: r < lo - 1e-8 || r > hi + 1e-8,
  };
}

export function bisection(f, lo, hi, iters = 40) {
  let a = lo, b = hi;
  let fa = f(a);
  for (let i = 0; i < iters; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fa * fm <= 0) {
      b = m;
    } else {
      a = m;
      fa = fm;
    }
  }
  return 0.5 * (a + b);
}
