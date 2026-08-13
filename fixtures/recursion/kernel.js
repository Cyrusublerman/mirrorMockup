import * as cplx from "../../src/shared_math/complex.js";

export const S = 256;
export const L = Math.log(S);
export const PUBLISHED = {
  alpha_re: 1,
  alpha_im: -0.8825424006,
  gamma_abs: 22.5836845286,
  gamma_arg_deg: 157.6255960832,
};

export function lattice(Sval = S, theta_s = 0) {
  const Lv = Math.log(Sval);
  const lambda1 = [Lv, theta_s];
  const lambda2 = [0, 2 * Math.PI];
  return { L: Lv, lambda1, lambda2, S: Sval, theta_s };
}

export function alpha(q, n, theta_s = 0, Sval = S) {
  const Lv = Math.log(Sval);
  return [n + (q * theta_s) / (2 * Math.PI), (-q * Lv) / (2 * Math.PI)];
}

export function gammaFromAlpha(alphaC, lambda1) {
  return cplx.exp(cplx.div(lambda1, alphaC));
}

export function W(z, p, alphaC, beta = [0, 0]) {
  const d = cplx.sub(z, p);
  return cplx.add(cplx.mul(alphaC, cplx.log(d)), beta);
}

export function similarityFixedPoint(a, b) {
  const oneMinusA = cplx.sub([1, 0], a);
  return cplx.div(b, oneMinusA);
}

export function outputRepeat(lambda1, alphaC) {
  return cplx.exp(cplx.div(lambda1, alphaC));
}

export function certifyKernel({ q = 1, n = 1, Sval = S, theta_s = 0 } = {}) {
  const lat = lattice(Sval, theta_s);
  const a = alpha(q, n, theta_s, Sval);
  const g = gammaFromAlpha(a, lat.lambda1);
  const twoPiIAlpha = cplx.mul([0, 2 * Math.PI], a);
  return {
    q,
    n,
    S: Sval,
    theta_s,
    alpha: a,
    lattice: lat,
    gamma: g,
    gamma_abs: cplx.abs(g),
    gamma_arg: cplx.arg(g),
    twoPiIAlpha,
  };
}
