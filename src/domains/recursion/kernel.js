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

import { certifyKernel as cert, W as mapW } from "../../../fixtures/recursion/kernel.js";
import * as cplx from "../../shared_math/complex.js";
import { centroid } from "../../shared_math/polygon.js";
import { sampleQ } from "../content_q/content.js";

const SINGULARITY = [192, 32, 80, 255];
const POLE_DISK = 1e-12;

export function setPrintGalleryMode(requested, mode) {
  const next = structuredClone(requested);
  next.recursion.mode = mode;
  return next;
}

export function autoAvailable(carrierP) {
  return !!(carrierP && carrierP.valid);
}

function poleOf(carrierP, policy) {
  const portal = (policy || "portal_fixed_point") === "portal_fixed_point";
  const quad = carrierP?.quad;
  if (portal && quad && quad.every((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]))) {
    return centroid(quad);
  }
  return [0.5, 0.5];
}

export function inverseW(w, p, alphaC, beta = [0, 0]) {
  return cplx.add(p, cplx.exp(cplx.div(cplx.sub(w, beta), alphaC)));
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
  const pole = poleOf(carrierP, requested.recursion.pole_policy);
  const ph = requested.recursion.phase;
  const beta = Array.isArray(ph) ? ph.slice() : [0, 0];
  certificate.pole = pole;
  certificate.beta = beta;
  certificate.singularity_policy = requested.recursion.singularity_policy || "disk";
  certificate.map = (z) => mapW(z, certificate.pole, certificate.alpha, certificate.beta);
  return {
    available,
    mode,
    refused: false,
    certificate,
    map: certificate.map,
    q: certificate.q,
    n: certificate.n,
    S: certificate.S,
  };
}

export function sampleSource(Wval, lat) {
  const red = cplx.reduceLattice(Wval, lat.lambda1, lat.lambda2);
  const u = red[0] / lat.L;
  const v = (red[1] + Math.PI) / (2 * Math.PI);
  return [((u % 1) + 1) % 1, ((v % 1) + 1) % 1];
}

export function sampleI(z, certificate, qState) {
  const p = certificate.pole;
  const d = cplx.sub(z, p);
  const r = cplx.abs(d);
  const policy = certificate.singularity_policy || "disk";
  if (!(r > POLE_DISK) && (policy === "disk" || r === 0)) {
    return { rgba: SINGULARITY.slice(), uv: null, W: null, reduced: null, folded: false };
  }
  const Wval = mapW(z, p, certificate.alpha, certificate.beta || [0, 0]);
  const lat = certificate.lattice;
  const reduced = cplx.reduceLattice(Wval, lat.lambda1, lat.lambda2);
  const uv = sampleSource(Wval, lat);
  const rgb = sampleQ(uv, qState || {});
  return {
    rgba: [Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255), 255],
    uv,
    W: Wval,
    reduced,
    folded: false,
  };
}

export function loopPeriod(certificate) {
  return Math.log(certificate.gamma_abs);
}
