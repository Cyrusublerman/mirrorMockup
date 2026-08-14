import landmarks from "../../../fixtures/P0/landmarks.js";
import { t } from "../../../fixtures/tolerances.js";
import { captureToFinal } from "../camera/crop.js";
import { occupancy as occ } from "./occupancy.js";
import { sameAnatomyScale } from "../visibility/report.js";

export { occupancy } from "./occupancy.js";

export const SUBJECT_MAP = {
  direct_head: { space: "direct", fk: "head" },
  direct_eye_L: { space: "unmeasured", fk: null, reason: "NO_DISTINCT_FK" },
  direct_eye_R: { space: "unmeasured", fk: null, reason: "NO_DISTINCT_FK" },
  direct_mouth: { space: "unmeasured", fk: null, reason: "NO_DISTINCT_FK" },
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

function featurePoint(f) {
  return f?.bbox_centre || null;
}

export function p0Targets() {
  const tLand = t("T-LANDMARK");
  const out = [];
  for (const [id, f] of Object.entries(landmarks.features)) {
    if (f.status === "missing") continue;
    const pt = featurePoint(f);
    if (!pt) continue;
    out.push({
      id,
      subject: id,
      metric: f.tl ? "bbox" : "point",
      coordinate_space: "IMAGE_NORM",
      frame: "FINAL_CROP",
      target: pt.slice(),
      bbox: f.tl && f.br ? { tl: f.tl, br: f.br } : null,
      tolerance: tLand,
      hard_or_soft: "soft",
      weight_if_soft: 1,
      weight_origin: "DEFAULT_UNIFORM",
      source_evidence: f.epistemic_status || "OBSERVED",
      r_p_triggers: false,
    });
  }
  return out;
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

function imageSeg(visibility, a, b, space) {
  const ra = visibility?.reports?.[a];
  const rb = visibility?.reports?.[b];
  const pa = space === "reflected" ? ra?.reflected?.projection?.image_norm : ra?.direct?.image_norm;
  const pb = space === "reflected" ? rb?.reflected?.projection?.image_norm : rb?.direct?.image_norm;
  if (!pa || !pb) return null;
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
}

function toFinal(p, crop) {
  if (!p) return null;
  return crop ? captureToFinal(p, crop) : p;
}

function measuredPoint(tgt, visibility, carrierP, mirrorImageQuadCapture, crop) {
  const spec = SUBJECT_MAP[tgt.id] || SUBJECT_MAP[tgt.subject];
  if (!spec) return { point: null, reason: "UNMAPPED" };
  if (spec.space === "unmeasured" || (spec.fk == null && spec.space !== "carrier_p" && spec.space !== "mirror_quad")) {
    return { point: null, reason: spec.reason || "NO_DISTINCT_FK" };
  }
  if (spec.space === "carrier_p") {
    return { point: toFinal(quadCentroid(carrierP?.quad_capture || carrierP?.quad), crop), reason: null };
  }
  if (spec.space === "mirror_quad") {
    return { point: toFinal(quadCentroid(mirrorImageQuadCapture), crop), reason: null };
  }
  const report = visibility?.reports?.[spec.fk];
  if (!report) return { point: null, reason: "NOT_VISIBLE" };
  if (spec.space === "direct") {
    const proj = report.direct;
    if (!proj?.valid) return { point: null, reason: "NOT_VISIBLE" };
    const p = (proj.image_norm || toFinal(proj.image_norm_capture, crop) || null)?.slice?.() || null;
    return { point: p, reason: p ? null : "NOT_VISIBLE" };
  }
  if (spec.space === "reflected") {
    const proj = report.reflected?.projection;
    if (!proj?.valid) return { point: null, reason: "NOT_VISIBLE" };
    const p = (proj.image_norm || toFinal(proj.image_norm_capture, crop) || null)?.slice?.() || null;
    return { point: p, reason: p ? null : "NOT_VISIBLE" };
  }
  return { point: null, reason: "UNMAPPED" };
}

export function evaluateMetrics(visibility, carrierP, requested, mirrorImageQuadCapture) {
  const head = landmarks.features.direct_head;
  const crop = requested.camera.crop_request;
  const targets = requested?.composition?.targets?.length ? requested.composition.targets : p0Targets();
  const residuals = {};
  let n_valid_residuals = 0;
  let max_residual = null;
  let measured_head = null;
  let measured_phone = null;

  for (const tgt of targets) {
    const { point: measured, reason } = measuredPoint(tgt, visibility, carrierP, mirrorImageQuadCapture, crop);
    if (!measured) {
      residuals[tgt.id] = {
        requested: tgt.target,
        effective: null,
        residual: null,
        tolerance: tgt.tolerance,
        frame: "FINAL_CROP",
        reason: reason || "NOT_VISIBLE",
        hard_or_soft: tgt.hard_or_soft || "soft",
      };
      continue;
    }
    const residual = Math.hypot(measured[0] - tgt.target[0], measured[1] - tgt.target[1]);
    residuals[tgt.id] = {
      requested: tgt.target,
      effective: measured,
      residual,
      tolerance: tgt.tolerance,
      frame: "FINAL_CROP",
      hard_or_soft: tgt.hard_or_soft || "soft",
    };
    n_valid_residuals += 1;
    if (max_residual === null || residual > max_residual) max_residual = residual;
    if (tgt.id === "direct_head") measured_head = measured;
    if (tgt.id === "phone") measured_phone = measured;
  }

  const areaCapture = Math.abs(carrierP?.area_capture ?? carrierP?.area ?? 0);
  const sizeD = imageSeg(visibility, "head", "pelvis", "direct");
  const sizeR = imageSeg(visibility, "head", "pelvis", "reflected");
  const lambda_star = sizeD != null && sizeR != null ? sameAnatomyScale(sizeR, sizeD) : null;
  const metrics = {
    direct_head_bbox_centre: head.bbox_centre,
    direct_head_occupancy: occ(head.tl, head.br),
    mirror_occupancy: occ(landmarks.features.mirror.tl, landmarks.features.mirror.br),
    phone_occupancy: occ(landmarks.features.phone.tl, landmarks.features.phone.br),
    R_P_capture: areaCapture,
    R_P_crop_non_triggering: true,
    carrier_p_area: carrierP?.area ?? null,
    carrier_p_valid: !!carrierP?.valid,
    same_anatomy_scale: lambda_star,
    measured_head,
    measured_phone,
    n_valid_residuals,
    max_residual,
  };
  const headCap = visibility?.reports?.head?.direct?.image_norm_capture;
  const phoneCap = quadCentroid(carrierP?.quad_capture);
  const phoneFeat = landmarks.features.phone.bbox_centre;
  if (headCap && phoneCap && head.bbox_centre && phoneFeat) {
    const gap = [headCap[0] - phoneCap[0], headCap[1] - phoneCap[1]];
    const gap0 = [head.bbox_centre[0] - phoneFeat[0], head.bbox_centre[1] - phoneFeat[1]];
    metrics.gap_capture = gap;
    metrics.gap_p0 = gap0;
    metrics.gap_residual = Math.hypot(gap[0] - gap0[0], gap[1] - gap0[1]);
  } else {
    metrics.gap_capture = null;
    metrics.gap_p0 = null;
    metrics.gap_residual = null;
  }
  return { metrics, residuals, profile: "P0" };
}
