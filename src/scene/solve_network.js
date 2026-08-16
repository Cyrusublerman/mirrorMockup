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
import { PhoneScale } from "../domains/phone/scale_propagate.js";
import { GazeConstraint } from "../domains/body/gaze.js";
import { VolumeMannequin } from "../domains/body/volume_mannequin.js";
import { ContourMannequin } from "../domains/body/contour_mannequin.js";
import { ArmSeven } from "../domains/body/arm_seven.js";
import { MaskCompare } from "../domains/composition/mask_compare.js";
import { MaskRender } from "../domains/reference/mask_extract.js";
import { add, scale } from "../shared_math/vector.js";
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
const SOLVER_VERSION = "1.1.0-v5";
const FD_STEP = 1e-3;
const screenQuad = new ScreenQuad();
const feasibleSet = new FeasibleSet();
const apertureBand = new ApertureBand();
const phoneScale = new PhoneScale();
const gaze = new GazeConstraint();
const volumes = new VolumeMannequin();
const contours = new ContourMannequin();
const armSeven = new ArmSeven();
const maskCompare = new MaskCompare();
const maskRender = new MaskRender();

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
  } else r.apparatus.mirror_distance_request_m = d;
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
    const solved = rootSolveDistance(from, target, (d) => measureRp(req, d, from, apparatus.frame.forward, apparatus.centre));
    if (req.mirror.frame_authority === "WORLD" && req.mirror.world_pose?.translation) {
      const delta = solved.d_M - from;
      const f = apparatus.frame.forward;
      req.mirror.world_pose.translation = [
        req.mirror.world_pose.translation[0] + f[0] * delta,
        req.mirror.world_pose.translation[1] + f[1] * delta,
        req.mirror.world_pose.translation[2] + f[2] * delta,
      ];
    } else req.apparatus.mirror_distance_request_m = solved.d_M;
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
  if (req.body?.pose_targets?.gaze === "MIRROR" && mirror.centre) pose = gaze.apply(pose, mirror.centre);
  const reflection = evaluateReflection(cam, mirror);
  const support = evaluateSupport(pose.fk, req);
  const bodyOcc = silhouetteOccluder(pose);
  const occluders = [{ mesh: phone.mesh, world: phone.world }, bodyOcc].filter(Boolean);
  const visibility = evaluateVisibility(pose.fk, cam, mirror, occluders);
  const carrier_p = screenQuad.evaluate(phone, cam, mirror);
  const feasible = feasibleSet.evaluate({
    face: pose.fk?.face_reference || pose.fk?.head,
    camera: cam.world?.translation,
    mirrorCentre: mirror.centre,
    mirrorNormal: mirror.basis?.n,
    shoulder: pose.fk?.shoulder_R,
    r: req.reference?.head_silhouette_radius_m || undefined,
  });
  if (req.reference?.head_silhouette_radius_m) feasible.r_epistemic = "DECLARED";
  const aperture_band = apertureBand.evaluate({ camera: cam, face: pose.fk?.face_reference || pose.fk?.head, mirror, stature: req.body?.definition?.stature || 1.7 });
  const fractions = visibility.fractions || {};
  const occlusion_intent = new OcclusionIntent(req.composition.occlusion_intent).evaluate({
    reflected_head: { fraction: fractions.reflected_head || 0 },
    reflected_torso: { fraction: fractions.reflected_torso || 0 },
    reflected_legs: { fraction: fractions.reflected_legs || 0 },
    reflected_phone: { fraction: carrier_p.valid ? 1 : 0 },
    direct_face: { fraction: fractions.direct_face || 0 },
  });
  const content_q = evaluateQ(req, carrier_p);
  const recursion = evaluateRecursion(req, carrier_p);
  const mirrorImageQuadCapture = (mirror.quad || []).map((X) => projectWorld(X, cam).image_norm_capture);
  const composition = evaluateMetrics(visibility, carrier_p, req, mirrorImageQuadCapture);
  const view = viewCameraAtTau(cam, apparatus, carrier_p, recursion, req.view.tau);
  return { phone, cam, apparatus, mirror, reflection, grip, pose, support, visibility, carrier_p, content_q, recursion, composition, view, compensation, feasible, aperture_band, occlusion_intent };
}

function silhouetteOccluder(pose) {
  const pts = ["pelvis", "shoulder_L", "shoulder_R", "head", "hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"]
    .map((k) => pose.fk?.[k]).filter((p) => p && p.length === 3);
  if (pts.length < 4) return null;
  const triangles = [];
  for (let i = 1; i < pts.length - 1; i++) triangles.push([0, i, i + 1]);
  return { mesh: { positions: pts, triangles }, world: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } };
}

function placePhoneByCrop(req, parts) {
  if (!allows(req, "crop_pan") || req.camera.crop_request.authored) return parts;
  const cap = parts.carrier_p?.quad_capture;
  if (!cap || cap.some((c) => !c)) return parts;
  const cx = (cap[0][0] + cap[1][0] + cap[2][0] + cap[3][0]) / 4;
  const cy = (cap[0][1] + cap[1][1] + cap[2][1] + cap[3][1]) / 4;
  const want = landmarks.features.phone.bbox_centre;
  req.camera.crop_request.pan = panToPlace([cx, cy], want, req.camera.crop_request.scale ?? 1);
  req.camera.crop_request.aspect = 3 / 4;
  req.camera.crop_request.authored = true;
  const saved = req.apparatus.mirror_distance_auto_solve;
  req.apparatus.mirror_distance_auto_solve = false;
  const next = solveOnce(cloneState(req));
  req.apparatus.mirror_distance_auto_solve = saved;
  return next;
}

function compositionResidualConstraints(req, residuals) {
  const out = [];
  for (const tgt of req.composition?.targets || []) {
    const row = residuals?.[tgt.id];
    if (!row || row.reason === "NO_DISTINCT_FK" || row.reason === "UNMAPPED") continue;
    const hard = (tgt.hard_or_soft ||