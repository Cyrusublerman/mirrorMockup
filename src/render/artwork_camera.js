import { add, scale } from "../shared_math/vector.js";
import { loopPeriod, loopPhase } from "../domains/recursion/kernel.js";

export function tauSegments(d_M, fillFraction) {
  const tau_M = 1;
  const tau_P = 2;
  return { tau_M, tau_P, d_M, fillFraction };
}

export function fillFraction(carrierP) {
  if (!carrierP?.quad) return 0;
  const q = carrierP.quad.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!q.length) return 0;
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return Math.max(w, h);
}

export function fillZoom(carrierP) {
  const f = fillFraction(carrierP);
  return 0.92 / Math.max(f, 0.02);
}

export function viewCameraAtTau(captureCam, apparatus, carrierP, recursion, tau) {
  const { tau_M, tau_P } = tauSegments(apparatus.d_M, 0);
  const C = captureCam.world.translation;
  const f = captureCam.basis.forward;
  const zoomFill = fillZoom(carrierP);
  let segment = "DOLLY";
  let camT = C.slice();
  let extraScale = 1;
  let phase = [0, 0];
  if (tau <= tau_M) {
    camT = add(C, scale(f, (tau / tau_M) * apparatus.d_M));
    segment = "DOLLY";
  } else if (tau <= tau_P) {
    const u = (tau - tau_M) / (tau_P - tau_M);
    camT = add(C, scale(f, apparatus.d_M));
    extraScale = 1 + u * (zoomFill - 1);
    segment = "APPROACH";
  } else {
    camT = add(C, scale(f, apparatus.d_M));
    extraScale = zoomFill;
    segment = recursion?.mode && recursion.mode !== "OFF" ? "LOOP" : "CLAMP";
    if (segment === "LOOP" && recursion.certificate) {
      phase = loopPhase(recursion.certificate, tau, tau_P);
      extraScale = zoomFill;
    }
  }
  return {
    translation: camT,
    look: f.slice(),
    segment,
    tau,
    tau_M,
    tau_P,
    extraScale,
    phase,
    loop_period: recursion?.certificate ? loopPeriod(recursion.certificate) : null,
    hfov: captureCam.hfov / extraScale,
    mutates_capture: false,
  };
}
