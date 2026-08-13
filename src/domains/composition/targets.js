import landmarks from "../../../fixtures/P0/landmarks.js";

export const SUBJECT_MAP = {
  direct_head: { space: "direct", fk: "head" },
  direct_eye_L: { space: "direct", fk: "head" },
  direct_eye_R: { space: "direct", fk: "head" },
  direct_mouth: { space: "direct", fk: "head" },
  mirror: { space: "mirror_quad" },
  reflected_body: { space: "reflected", fk: "pelvis" },
  phone: { space: "carrier_p" },
  reflected_head: { space: "reflected", fk: "head" },
  reflected_shoulder_R: { space: "reflected", fk: "shoulder_R" },
  reflected_elbow_R: { space: "reflected", fk: "elbow_R" },
  reflected_wrist_R: { space: "reflected", fk: "wrist_R" },
  reflected_pelvis: { space: "reflected", fk: "pelvis" },
  reflected_knee_L: { space: "reflected", fk: "knee_L" },
  reflected_knee_R: { space: "reflected", fk: "knee_R" },
  reflected_ankle_L: { space: "reflected", fk: "ankle_L" },
  reflected_ankle_R: { space: "reflected", fk: "ankle_R" },
};

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

function quadCentroid(quad) {
  if (!quad || quad.length < 4) return null;
  let x = 0;
  let y = 0;
  for (let i = 0; i < 4; i++) {
    const p = quad[i];
    if (!p || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
    x += p[0];
    y += p[1];
  }
  return [x / 4, y / 4];
}

function measuredPoint(tgt, visibility, carrierP, mirrorImageQuad) {
  const spec = SUBJECT_MAP[tgt.id] || SUBJECT_MAP[tgt.subject];
  if (!spec) return null;
  if (spec.space === "carrier_p") return quadCentroid(carrierP?.quad);
  if (spec.space === "mirror_quad") return quadCentroid(mirrorImageQuad);
  const report = visibility?.reports?.[spec.fk];
  if (!report) return null;
  if (spec.space === "direct") {
    const proj = report.direct;
    if (!proj?.valid || !proj.image_norm) return null;
    return proj.image_norm.slice();
  }
  if (spec.space === "reflected") {
    const proj = report.reflected?.projection;
    if (!proj?.valid || !proj.image_norm) return null;
    return proj.image_norm.slice();
  }
  return null;
}

export function evaluateMetrics(visibility, carrierP, requested, mirrorImageQuad) {
  const head = landmarks.features.direct_head;
  const targets = requested?.composition?.targets?.length ? requested.composition.targets : p0Targets();
  const residuals = {};
  let n_valid_residuals = 0;
  let max_residual = null;
  let measured_head = null;
  let measured_phone = null;

  for (const tgt of targets) {
    const measured = measuredPoint(tgt, visibility, carrierP, mirrorImageQuad);
    if (!measured) {
      residuals[tgt.id] = {
        requested: tgt.target,
        effective: null,
        residual: null,
        tolerance: tgt.tolerance,
        reason: "NOT_VISIBLE",
      };
      continue;
    }
    const residual = Math.hypot(measured[0] - tgt.target[0], measured[1] - tgt.target[1]);
    residuals[tgt.id] = {
      requested: tgt.target,
      effective: measured,
      residual,
      tolerance: tgt.tolerance,
    };
    n_valid_residuals += 1;
    if (max_residual === null || residual > max_residual) max_residual = residual;
    if (tgt.id === "direct_head") measured_head = measured;
    if (tgt.id === "phone") measured_phone = measured;
  }

  const metrics = {
    direct_head_centroid: head.centroid,
    direct_head_occupancy: occupancy(head.tl, head.br),
    mirror_occupancy: occupancy(landmarks.features.mirror.tl, landmarks.features.mirror.br),
    phone_occupancy: occupancy(landmarks.features.phone.tl, landmarks.features.phone.br),
    carrier_p_area: carrierP?.area ?? null,
    carrier_p_valid: !!carrierP?.valid,
    measured_head,
    measured_phone,
    n_valid_residuals,
    max_residual,
  };
  return { metrics, residuals, profile: "P0" };
}
