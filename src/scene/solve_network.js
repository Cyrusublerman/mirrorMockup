import { cloneState } from "./requested_state.js";
import { constraintResult, emptyEffective } from "./effective_state.js";
import { evaluatePhone, phoneFromWrist } from "../domains/phone/prism.js";
import { evaluateCamera } from "../domains/camera/model.js";
import { evaluateApparatus, rootSolveDistance } from "../domains/apparatus/relation.js";
import { evaluateMirror, fitAperture } from "../domains/mirror/mesh.js";
import { evaluateReflection } from "../domains/reflection/reflect.js";
import { evaluatePose } from "../domains/pose/solve.js";
import { evaluateSupport } from "../domains/support/contact.js";
import { evaluateGrip } from "../domains/hand_grip/grip.js";
import { evaluateVisibility, projectWorld } from "../domains/visibility/report.js";
import { evaluateCarrierP } from "../domains/carrier_p/project.js";
import { ScreenQuad } from "../domains/carrier_p/screen_quad.js";
import { FeasibleSet } from "../domains/apparatus/feasible_set.js";
import { ApertureBand } from "../domains/visibility/aperture_band.js";
import { OcclusionIntent } from "../domains/visibility/occlusion_intent.js";
import { evaluateQ } from "../domains/content_q/content.js";
import { evaluateRecursion } from "../domains/recursion/kernel.js";
import { evaluateMetrics, p0Targets } from "../domains/composition/targets.js";
import { fitLayout, shouldLayoutFit, opticalLockHolds } from "../domains/composition/layout_fit.js";
import { viewCameraAtTau, fillFraction } from "../render/artwork_camera.js";
import { applySolveMode, allows, modeMask } from "./solve_policy.js";
import { partitionX } from "./variable_partition.js";
import { panToPlace } from "../domains/camera/crop.js";
import { jacobian } from "../shared_math/jacobian.js";
import { createProposal } from "./proposals.js";
import { SEMANTIC } from "../domains/body/skeleton.js";
import { minCarrierPx, toleranceSetHash, t } from "../../fixtures/tolerances.js";
import landmarks from "../../fixtures/P0/landmarks.js";

const SOLVER_ID = "mirror-portrait-nls";
const SOLVER_VERSION = "1.0.0";
const FD_STEP = 1e-3;
const screenQuad = new ScreenQuad();
const feasibleSet = new FeasibleSet();
const apertureBand = new ApertureBand();

function solvePhonePose(req) {
  if (req.phone.authority === "HAND_DRIVES_PHONE") {
    const pose = evaluatePose(req, null, null);
    const wristXf = pose.world?.[SEMANTIC.wrist_R];
    const phoneWorld = wristXf ? phoneFromWrist(wristXf, req.phone.grip_relation) : null;
    const phone = evaluatePhone(req, phoneWorld || undefined);
    const grip = evaluateGrip(phone, req);
    return { phone, pose, grip };
  }
  const phone = evaluatePhone(req);
  const grip = evaluateGrip(phone, req);
  const pose = evaluatePose(req, phone.grip_world, grip);
  return { phone, pose, grip };
}

function measureRp(req, d, from, forward, centre) {
  const r = cloneState(req);
  r.apparatus.mirror_distance_auto_solve = false;
  if (r.mirror.frame_authority === "WORLD" && centre && forward) {
    const delta = d - from;
    r.mirror.world_pose = {
      translation: [centre[0] + forward[0] * delta, centre[1] + forward[1] * delta, centre[2] + forward[2] * delta],
      rotation: r.mirror.world_pose?.rotation || [0, 0, 0, 1],
    };
  } else {
    r.apparatus.mirror_distance_request_m = d;
  }
  const { phone } = solvePhonePose(r);
  const cam = evaluateCamera(phone.world, r);
  const apparatus = evaluateApparatus(cam, r);
  const mirror = evaluateMirror(apparatus, r);
  const p = evaluateCarrierP(phone, cam, mirror);
  return Math.abs(p.area_capture ?? p.area ?? 0);
}

function solveOnce(req) {
  let { phone, pose, grip } = solvePhonePose(req);
  let cam = evaluateCamera(phone.world, req);
  let apparatus = evaluateApparatus(cam, req);
  let compensation = null;

  if (req.mirror.frame_authority !== "APPARATUS" && !req.mirror.world_pose?.translation) {
    req.mirror.world_pose = { translation: apparatus.centre.slice(), rotation: [0, 0, 0, 1] };
    apparatus = evaluateApparatus(cam, req);
  }

  const ratioLocked = req.apparatus.mirror_distance_auto_solve || (req.composition.active_preserve_set || []).includes("R_P");
  if (ratioLocked && allows(req, "mirror_distance")) {
    const from = apparatus.d_M;
    const target = req.apparatus.preserved_reflected_phone_ratio;
    const solved = rootSolveDistance(from, target, (d) =>
      measureRp(req, d, from, apparatus.frame.forward, apparatus.centre),
    );
    if (req.mirror.frame_authority === "WORLD" && req.mirror.world_pose?.translation) {
      const delta = solved.d_M - from;
      const f = apparatus.frame.forward;
      req.mirror.world_pose.translation = [
        req.mirror.world_pose.translation[0] + f[0] * delta,
        req.mirror.world_pose.translation[1] + f[1] * delta,
        req.mirror.world_pose.translation[2] + f[2] * delta,
      ];
    } else {
      req.apparatus.mirror_distance_request_m = solved.d_M;
    }
    apparatus = evaluateApparatus(cam, req);
    compensation = {
      variable: "mirror_distance_request_m",
      from,
      to: apparatus.d_M,
      reason: "preserved_reflected_phone_ratio",
      inspectable: true,
      depth_order: solved.projected ? "PROJECTED" : "PASS",
    };
  }

  const mirror = evaluateMirror(apparatus, req);
  const reflection = evaluateReflection(cam, mirror);
  const support = evaluateSupport(pose.fk, req);
  const bodyOcc = silhouetteOccluder(pose);
  const occluders = [{ mesh: phone.mesh, world: phone.world }, bodyOcc].filter(Boolean);
  const visibility = evaluateVisibility(pose.fk, cam, mirror, occluders);
  const carrier_p = screenQuad.evaluate(phone, cam, mirror);
  const feasible = feasibleSet.evaluate({
    face: pose.fk?.head,
    camera: cam.world?.translation,
    mirrorCentre: mirror.centre,
    mirrorNormal: mirror.basis?.n,
    shoulder: pose.fk?.shoulder_R,
  });
  const aperture_band = apertureBand.evaluate({
    camera: cam,
    face: pose.fk?.head,
    mirror,
    stature: req.body?.definition?.stature || 1.7,
  });
  const visFrac = (name, space) => {
    const r = visibility.reports?.[name];
    if (!r) return 0;
    return space === "reflected" ? (r.reflected?.visible ? 1 : 0) : (r.direct?.valid ? 1 : 0);
  };
  const occlusion_intent = new OcclusionIntent(req.composition.occlusion_intent).evaluate({
    reflected_head: visFrac("head", "reflected"),
    reflected_torso: visFrac("pelvis", "reflected"),
    reflected_legs: (visFrac("ankle_L", "reflected") + visFrac("ankle_R", "reflected")) / 2,
    reflected_phone: carrier_p.valid ? 1 : 0,
    direct_face: visFrac("head", "direct"),
  });
  const content_q = evaluateQ(req, carrier_p);
  const recursion = evaluateRecursion(req, carrier_p);
  const mirrorImageQuadCapture = (mirror.quad || []).map((X) => projectWorld(X, cam).image_norm_capture);
  const composition = evaluateMetrics(visibility, carrier_p, req, mirrorImageQuadCapture);
  const view = viewCameraAtTau(cam, apparatus, carrier_p, recursion, req.view.tau);
  return {
    phone,
    cam,
    apparatus,
    mirror,
    reflection,
    grip,
    pose,
    support,
    visibility,
    carrier_p,
    content_q,
    recursion,
    composition,
    view,
    compensation,
    feasible,
    aperture_band,
    occlusion_intent,
  };
}

function silhouetteOccluder(pose) {
  const pts = ["pelvis", "shoulder_L", "shoulder_R", "head", "hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"]
    .map((k) => pose.fk?.[k])
    .filter((p) => p && p.length === 3);
  if (pts.length < 4) return null;
  const triangles = [];
  for (let i = 1; i < pts.length - 1; i++) triangles.push([0, i, i + 1]);
  return {
    mesh: { positions: pts, triangles },
    world: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  };
}

function placePhoneByCrop(req, parts) {
  if (!allows(req, "crop_pan")) return parts;
  if (req.camera.crop_request.authored) return parts;
  const cap = parts.carrier_p?.quad_capture;
  if (!cap || cap.some((c) => !c)) return parts;
  const cx = (cap[0][0] + cap[1][0] + cap[2][0] + cap[3][0]) / 4;
  const cy = (cap[0][1] + cap[1][1] + cap[2][1] + cap[3][1]) / 4;
  const want = landmarks.features.phone.bbox_centre;
  req.camera.crop_request.pan = panToPlace([cx, cy], want, req.camera.crop_request.scale ?? 1);
  req.camera.crop_request.aspect = 3 / 4;
  return solveOnce(cloneState(req));
}

function compositionResidualConstraints(req, residuals) {
  const out = [];
  for (const tgt of req.composition?.targets || []) {
    const row = residuals?.[tgt.id];
    if (!row) continue;
    if (row.reason === "NO_DISTINCT_FK" || row.reason === "UNMAPPED") continue;
    const hard = (tgt.hard_or_soft || row.hard_or_soft || "soft") === "hard";
    const tol = row.tolerance ?? tgt.tolerance ?? 0;
    if (row.residual == null) {
      out.push(
        constraintResult({
          state: hard ? "FAIL" : "PROJECTED",
          constraint_id: `target_${tgt.id}`,
          requested: row.requested ?? tgt.target,
          effective: null,
          residual: null,
          tolerance: tol,
          reason: row.reason || "NOT_VISIBLE",
        }),
      );
      continue;
    }
    const inTol = row.residual <= tol;
    out.push(
      constraintResult({
        state: inTol ? "PASS" : hard ? "FAIL" : "PROJECTED",
        constraint_id: `target_${tgt.id}`,
        requested: row.requested ?? tgt.target,
        effective: row.effective,
        residual: row.residual,
        tolerance: tol,
        reason: inTol ? "" : "OUT_OF_TOLERANCE",
      }),
    );
  }
  return out;
}

function applyReflectedNudge(req, parts) {
  const d = req.composition.reflected_content_delta;
  if (!d || (d[0] === 0 && d[1] === 0)) return parts;
  if (!allows(req, "pose")) return parts;
  const body = parts.composition.residuals?.reflected_body;
  if (!body?.effective) return parts;
  const want = [body.effective[0] + d[0], body.effective[1] + d[1]];
  const root = req.body.pose_targets.root.translation;
  const J = jacobian(
    (x) => {
      const r = cloneState(req);
      r.body.pose_targets.root.translation = [x[0], root[1], x[1]];
      r.composition.reflected_content_delta = [0, 0];
      const p = solveOnce(r);
      return p.composition.residuals.reflected_body?.effective || body.effective;
    },
    [root[0], root[2]],
    2,
    FD_STEP,
  );
  const err = [want[0] - body.effective[0], want[1] - body.effective[1]];
  const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  if (Math.abs(det) < 1e-12) return parts;
  const dx = (J[1][1] * err[0] - J[0][1] * err[1]) / det;
  const dz = (-J[1][0] * err[0] + J[0][0] * err[1]) / det;
  req.body.pose_targets.root.translation = [root[0] + dx, root[1], root[2] + dz];
  req.composition.reflected_content_delta = [0, 0];
  return solveOnce(cloneState(req));
}

function slimLayoutEval(req) {
  const r = cloneState(req);
  r.apparatus.mirror_distance_auto_solve = false;
  r.composition.active_preserve_set = (r.composition.active_preserve_set || []).filter((x) => x !== "R_P");
  return solveOnce(r);
}

function pinWorldMirror(req, parts) {
  if (req.mirror.frame_authority !== "WORLD" || !parts.apparatus?.centre) return;
  req.mirror.world_pose = {
    translation: parts.apparatus.centre.slice(),
    rotation: req.mirror.world_pose?.rotation || [0, 0, 0, 1],
  };
}

function phoneCentroidCapture(req) {
  const phone = evaluatePhone(req);
  const cam = evaluateCamera(phone.world, req);
  const apparatus = evaluateApparatus(cam, req);
  const mirror = evaluateMirror(apparatus, req);
  const p = evaluateCarrierP(phone, cam, mirror);
  const q = p.quad_capture || p.quad;
  if (!q || q.some((c) => !c)) return [0.5, 0.5];
  return [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
}

function sensitivityAt(req) {
  const x0 = [req.apparatus.mirror_distance_request_m, req.camera.hfov_request, req.camera.crop_request.pan[0]];
  const J = jacobian(
    (x) => {
      const r = cloneState(req);
      r.apparatus.mirror_distance_auto_solve = false;
      r.apparatus.mirror_distance_request_m = x[0];
      r.camera.hfov_request = x[1];
      r.camera.crop_request.pan = [x[2], r.camera.crop_request.pan[1]];
      const phone = evaluatePhone(r);
      const cam = evaluateCamera(phone.world, r);
      const apparatus = evaluateApparatus(cam, r);
      const mirror = evaluateMirror(apparatus, r);
      const p = evaluateCarrierP(phone, cam, mirror);
      const q = p.quad;
      if (!q || q.some((c) => !c)) return [0.5, 0.5];
      return [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
    },
    x0,
    2,
    FD_STEP,
  );
  return [
    { of: "phone_cx_final", wrt: "d_M", value: J[0][0] },
    { of: "phone_cy_final", wrt: "d_M", value: J[1][0] },
    { of: "phone_cx_final", wrt: "hfov", value: J[0][1] },
    { of: "phone_cy_final", wrt: "hfov", value: J[1][1] },
    { of: "phone_cx_final", wrt: "crop_pan_u", value: J[0][2] },
    { of: "phone_cy_final", wrt: "crop_pan_u", value: J[1][2] },
  ];
}

export function solve(requested) {
  let req = cloneState(requested);
  if (!req.composition.targets.length) req.composition.targets = p0Targets();
  const mask = modeMask(req.composition.solve_mode);
  req = applySolveMode(req, req.composition.solve_mode);
  const partition = partitionX(req);

  let parts = solveOnce(cloneState(req));
  pinWorldMirror(req, parts);
  let layout = null;
  if (shouldLayoutFit(req)) {
    layout = fitLayout(req, slimLayoutEval);
    parts = solveOnce(cloneState(req));
  }
  const mode = req.composition.solve_mode;
  if (mode === "P0_RECONSTRUCT" || mode === "COMPOSITION_FIT") {
    parts = placePhoneByCrop(req, parts);
  }
  parts = applyReflectedNudge(req, parts);

  const {
    phone, cam, apparatus, mirror, reflection, grip, pose, support,
    visibility, carrier_p, content_q, recursion, composition, view, compensation,
    feasible, aperture_band, occlusion_intent,
  } = parts;

  let proposal = req.workspace.proposal || null;
  if (req.workspace.pending_mirror_fit) {
    const uvs = [];
    for (const r of Object.values(visibility.reports || {})) {
      if (r.reflected?.aperture?.uv) uvs.push(r.reflected.aperture.uv);
    }
    const fit = uvs.length
      ? fitAperture(uvs, req.mirror.fit_margin_m)
      : { width: req.mirror.width_m, height: req.mirror.height_m };
    proposal = createProposal({
      id: "mirror_fit",
      kind: "MIRROR_FIT",
      description: "fit aperture to reflected content",
      patch: { mirror: { width_m: fit.width, height_m: fit.height } },
      parent_id: req.workspace.last_edit?.action || null,
    });
  }
  if (req.phone.authority === "RELAX_GRIP") {
    proposal = createProposal({
      id: "relax_grip",
      kind: "RELAX_GRIP",
      description: "solver may adjust grip; not applied until accepted",
      patch: {},
      parent_id: req.workspace.last_edit?.action || null,
    });
  }

  const nLevels = Math.abs(req.recursion.n) || 1;
  const needPx = minCarrierPx(nLevels);
  const widthPx = req.camera.crop_request.width_px || 1080;
  const carrierPx = Math.sqrt(Math.abs(carrier_p.area || 0)) * widthPx;
  const carrierConflict = carrierPx < needPx;
  if (carrierConflict && recursion.certificate && recursion.loop_state === "EXACT") {
    recursion.loop_state = "DEGRADED";
    recursion.degrade_reason = "min_carrier_px";
    recursion.named_conflict = { needPx, carrierPx, profile: "P0" };
  }

  const constraints = [
    ...(pose.constraints || []).map((c) =>
      constraintResult({
        state: c.state,
        constraint_id: c.id,
        requested: null,
        effective: null,
        residual: c.residual,
        moved_variables: pose.coupled?.moved || [],
      }),
    ),
    ...support.reports.map((r) =>
      constraintResult({
        state: r.state,
        constraint_id: `support_${r.contact}`,
        requested: support.floor_z,
        effective: r.z,
        residual: r.penetration,
      }),
    ),
    constraintResult({
      state: apparatus.parallel_residual < 1e-6 ? "PASS" : "PROJECTED",
      constraint_id: "apparatus_parallel",
      requested: -1,
      effective: -1 + apparatus.parallel_residual,
      residual: apparatus.parallel_residual,
    }),
    constraintResult({
      state: carrier_p.valid ? "PASS" : "FAIL",
      constraint_id: "carrier_p",
      requested: true,
      effective: carrier_p.valid,
      residual: carrier_p.valid ? 0 : 1,
      reason: (carrier_p.reasons || []).join(","),
    }),
    constraintResult({
      state: feasible?.inside ? "PASS" : "PROJECTED",
      constraint_id: "feasible_set",
      requested: true,
      effective: !!feasible?.inside,
      residual: feasible?.distance_to_boundary ?? 0,
      reason: (feasible?.reasons || []).join(","),
    }),
    constraintResult({
      state: occlusion_intent?.ok ? "PASS" : "PROJECTED",
      constraint_id: "occlusion_intent",
      requested: true,
      effective: !!occlusion_intent?.ok,
      residual: occlusion_intent?.ok ? 0 : 1,
      reason: (occlusion_intent?.violations || []).join(","),
    }),
    ...compositionResidualConstraints(req, composition.residuals),
  ];
  if (composition.metrics?.gap_residual != null) {
    const g = composition.metrics.gap_residual;
    const inTol = g <= t("T-LANDMARK");
    constraints.push(
      constraintResult({
        state: inTol ? "PASS" : "PROJECTED",
        constraint_id: "target_gap",
        requested: composition.metrics.gap_p0,
        effective: composition.metrics.gap_capture,
        residual: g,
        tolerance: t("T-LANDMARK"),
        reason: inTol ? "" : "OUT_OF_TOLERANCE",
      }),
    );
  }
  if (layout) {
    composition.metrics.layout_fit = {
      iterations: layout.iterations,
      cost0: layout.cost0,
      cost: layout.cost,
      accepted: layout.accepted,
      optical_lock: opticalLockHolds(parts),
    };
  }
  if (carrierConflict) {
    constraints.push(
      constraintResult({
        state: "PROJECTED",
        constraint_id: "min_carrier_px",
        requested: needPx,
        effective: carrierPx,
        residual: needPx - carrierPx,
        reason: "P0 carrier vs recursion depth",
      }),
    );
  }
  if (compensation) {
    constraints.push(
      constraintResult({
        state: compensation.depth_order,
        constraint_id: "autosolve_d_M",
        requested: compensation.from,
        effective: compensation.to,
        residual: compensation.to - compensation.from,
        reason: compensation.reason,
        moved_variables: [compensation.variable],
      }),
    );
  }

  const top = constraints.some((c) => c.state === "FAIL")
    ? "FAIL"
    : constraints.some((c) => c.state === "PROJECTED")
      ? "PROJECTED"
      : "PASS";

  let sensitivity = [];
  try {
    sensitivity = sensitivityAt(req);
  } catch {
    sensitivity = [];
  }

  const last_edit = requested.workspace?.last_edit || null;
  const solver = {
    solver_id: SOLVER_ID,
    solver_version: SOLVER_VERSION,
    seed: 0,
    iterations: layout?.iterations ?? 12,
    converged: top !== "FAIL",
    fd_step: FD_STEP,
    tolerance_set_hash: toleranceSetHash(),
  };

  if (apparatus.centre) {
    req.mirror.world_pose = {
      translation: apparatus.centre.slice(),
      rotation: req.mirror.world_pose?.rotation || [0, 0, 0, 1],
    };
  }

  const effective = {
    ...emptyEffective(),
    skeleton: pose,
    phone,
    camera: cam,
    apparatus,
    mirror,
    virtual_camera: reflection.virtual_camera,
    visibility,
    composition_metrics: composition.metrics,
    carrier_p,
    content_q,
    recursion,
    view: { ...view, fillFraction: fillFraction(carrier_p) },
    constraints,
    residuals: composition.residuals,
    support,
    grip,
    transaction: top,
    sensitivity,
    proposal,
    compensation,
    feasible,
    aperture_band,
    occlusion_intent,
    last_edit,
    driver: last_edit?.driver || mask.driver,
    preserve: req.composition.active_preserve_set,
    allowed_to_move: req.composition.solve_freedoms,
    x_decision: partition.x_decision,
    x_dependent: partition.x_dependent,
    x_locked: partition.x_locked,
    solver,
  };

  return { requested: req, effective, transaction: top };
}

export { phoneCentroidCapture };
