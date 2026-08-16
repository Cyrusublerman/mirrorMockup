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

import { certifyKernel as cert, W as mapW, similarityFixedPoint } from "../../../fixtures/recursion/kernel.js";
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
  const reasons = carrierP?.reasons || ["P_INVALID"];
  if (mode === "AUTO" && !available) {
    return {
      available: false,
      mode: "OFF",
      refused: true,
      loop_state: "REFUSED",
      certificate_kind: "NON-CLOSING",
      reasons,
      certificate: null,
    };
  }
  if (mode === "OFF") {
    return { available, mode: "OFF", refused: false, loop_state: "OFF", certificate_kind: null, certificate: null };
  }
  const certificate = cert({
    q: requested.recursion.q,
    n: requested.recursion.n,
    Sval: requested.recursion.source_period,
    theta_s: requested.recursion.source_rotation,
  });
  const p_log = poleOf(carrierP, requested.recursion.pole_policy);
  const g = certificate.gamma;
  const b = cplx.sub(p_log, cplx.mul(g, p_log));
  const pFix = similarityFixedPoint(g, b);
  certificate.p_log = p_log;
  certificate.pole = p_log;
  const ph = requested.recursion.phase;
  const beta = Array.isArray(ph) ? ph.slice() : [0, 0];
  certificate.beta = beta;
  certificate.singularity_policy = requested.recursion.singularity_policy || "disk";
  certificate.map = (z) => mapW(z, certificate.pole, certificate.alpha, certificate.beta);
  certificate.loop_period = Math.log(certificate.gamma_abs);
  certificate.output_repeat = certificate.gamma_abs;
  const probe = [p_log[0] + 0.2, p_log[1]];
  certificate.detJ_probe = mapJacobianDet(probe, certificate);
  certificate.no_fold = certificate.detJ_probe > 0;
  const coincide = Math.hypot((pFix[0] || 0) - p_log[0], (pFix[1] || 0) - p_log[1]) < 1e-9;
  certificate.p_fix = pFix;
  certificate.p_log_p_fix_coincide = coincide;
  let loop_state = "EXACT";
  let certificate_kind = "EXACT";
  if (!certificate.no_fold) {
    loop_state = "DEGRADED";
    certificate_kind = "FOLD-RISK";
  }
  return {
    available,
    mode,
    refused: false,
    loop_state,
    certificate_kind,
    reasons: available ? [] : reasons,
    certificate,
    map: certificate.map,
    output_repeat: certificate.output_repeat,
    p_log,
    p_fix: pFix,
  };
}

export function gpuSampleUv(z, certificate) {
  if (!certificate) return null;
  const w = mapW(z, certificate.pole, certificate.alpha, certificate.beta || [0, 0]);
  return sampleSource(w, certificate.lattice);
}

export function shaderUsesKernel() {
  return "domains/recursion/kernel.js";
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
  const detJ = mapJacobianDet(z, certificate);
  const rgb = sampleQ(uv, qState || {});
  return {
    rgba: [Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255), 255],
    uv,
    W: Wval,
    reduced,
    folded: detJ <= 0,
    detJ,
    footprint: 1 / Math.max(Math.sqrt(Math.abs(detJ)), 1e-9),
  };
}

export function loopPeriod(certificate) {
  return Math.log(certificate.gamma_abs);
}

export function loopPhase(certificate, tau, tau_P = 2) {
  const period = loopPeriod(certificate);
  const steps = Math.max(0, tau - tau_P);
  return [steps * period, 0];
}

export function mapJacobianDet(z, certificate) {
  const d = cplx.sub(z, certificate.pole);
  const r2 = d[0] * d[0] + d[1] * d[1];
  if (r2 < POLE_DISK) return 0;
  const a = certificate.alpha;
  const mag2 = (a[0] * a[0] + a[1] * a[1]) / r2;
  return mag2;
}

export function inverseDesiredPortal({ k, theta_out, q = 1, n = 1 }) {
  const a = cplx.fromPolar(k, theta_out);
  const gamma = cplx.div([1, 0], a);
  const g = cplx.log(gamma);
  const denom = cplx.add([1, 0], cplx.mul([0, q / (2 * Math.PI)], g));
  const lambda1 = cplx.div(cplx.scale(g, n), denom);
  const Sval = Math.exp(lambda1[0]);
  const theta_s = lambda1[1];
  const compatible = Sval > 1 && Number.isFinite(Sval) && Number.isFinite(theta_s);
  const certificate = compatible ? cert({ q, n, Sval, theta_s }) : null;
  let residual = Infinity;
  if (certificate) {
    residual = Math.hypot(certificate.gamma[0] - gamma[0], certificate.gamma[1] - gamma[1]);
  }
  return {
    a,
    gamma,
    g,
    lambda1,
    S: Sval,
    theta_s,
    compatible,
    certificate,
    residual,
    reason: compatible ? "" : "S_NOT_GREATER_THAN_1",
  };
}
