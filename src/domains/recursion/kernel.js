export {
  lattice,
  alpha,
  gammaFromAlpha,
  W,
  similarityFixedPoint,
  outputRepeat,
  certifyKernel,
  S,
  L,
  PUBLISHED,
} from "../../../fixtures/recursion/kernel.js";

import { certifyKernel as cert, W as mapW, lattice, alpha } from "../../../fixtures/recursion/kernel.js";
import * as cplx from "../../shared_math/complex.js";
import { applyHomography } from "../../shared_math/homography.js";

export function setPrintGalleryMode(requested, mode) {
  const next = structuredClone(requested);
  next.recursion.mode = mode;
  return next;
}

export function autoAvailable(carrierP) {
  return !!(carrierP && carrierP.valid);
}

export function evaluateRecursion(requested, carrierP) {
  const mode = requested.recursion.mode;
  const available = autoAvailable(carrierP);
  if (mode === "AUTO" && !available) {
    return {
      available: false,
      mode: "OFF",
      refused: true,
      reasons: carrierP?.reasons || ["P_INVALID"],
      certificate: null,
    };
  }
  if (mode === "OFF") {
    return { available, mode: "OFF", certificate: null, refused: false };
  }
  const certificate = cert({
    q: requested.recursion.q,
    n: requested.recursion.n,
    Sval: requested.recursion.source_period,
    theta_s: requested.recursion.source_rotation,
  });
  let pole = [0.5, 0.5];
  if (carrierP?.quad) {
    const q = carrierP.quad;
    pole = [
      (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4,
      (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4,
    ];
  }
  certificate.pole = pole;
  certificate.beta = requested.recursion.phase;
  return {
    available,
    mode,
    refused: false,
    certificate,
    map: (z) => mapW(z, pole, certificate.alpha, certificate.beta),
  };
}

export function sampleSource(Wval, lat) {
  const red = cplx.reduceLattice(Wval, lat.lambda1, lat.lambda2);
  const u = red[0] / lat.L;
  const v = (red[1] + Math.PI) / (2 * Math.PI);
  return [((u % 1) + 1) % 1, ((v % 1) + 1) % 1];
}

export function loopPeriod(certificate) {
  return Math.log(certificate.gamma_abs);
}
