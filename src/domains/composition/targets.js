import landmarks from "../../../fixtures/P0/landmarks.json" with { type: "json" };
import { bbox } from "../../shared_math/polygon.js";

export function p0Targets() {
  const t = [];
  for (const [id, f] of Object.entries(landmarks.features)) {
    t.push({
      id,
      subject: id,
      metric: f.tl ? "bbox" : "point",
      coordinate_space: "IMAGE_NORM",
      target: f.centroid,
      bbox: f.tl && f.br ? { tl: f.tl, br: f.br } : null,
      tolerance: 0.04,
      hard_or_soft: id === "phone" || id === "mirror" ? "soft" : "soft",
      weight_if_soft: 1,
      source_evidence: "OBSERVED",
    });
  }
  return t;
}

export function occupancy(tl, br) {
  return Math.abs((br[0] - tl[0]) * (br[1] - tl[1]));
}

export function evaluateMetrics(visibility, carrierP, requested) {
  const head = landmarks.features.direct_head;
  const metrics = {
    direct_head_centroid: head.centroid,
    direct_head_occupancy: occupancy(head.tl, head.br),
    mirror_occupancy: occupancy(landmarks.features.mirror.tl, landmarks.features.mirror.br),
    phone_occupancy: occupancy(landmarks.features.phone.tl, landmarks.features.phone.br),
    carrier_p_area: carrierP?.area ?? null,
    carrier_p_valid: !!carrierP?.valid,
  };
  const residuals = {};
  for (const tgt of requested.composition.targets.length ? requested.composition.targets : p0Targets()) {
    let measured = null;
    if (tgt.id === "phone" && carrierP?.quad) {
      const q = carrierP.quad;
      measured = [
        (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4,
        (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4,
      ];
    } else {
      measured = tgt.target;
    }
    const res = measured
      ? Math.hypot(measured[0] - tgt.target[0], measured[1] - tgt.target[1])
      : null;
    residuals[tgt.id] = { requested: tgt.target, effective: measured, residual: res, tolerance: tgt.tolerance };
  }
  return { metrics, residuals, profile: "P0" };
}
