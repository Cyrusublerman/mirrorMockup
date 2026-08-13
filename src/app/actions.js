import { cloneState } from "../scene/requested_state.js";
import { applySolveMode } from "../scene/solve_policy.js";
import { createProposal, acceptProposal, rejectProposal, applyPatch } from "../scene/proposals.js";
import { anatomicalQuat } from "../domains/body/skeleton.js";

export const ACTION_NAMES = [
  "LOAD_P0_PROFILE",
  "LOAD_REFERENCE",
  "SET_REFERENCE_REGISTRATION",
  "SET_COMPOSITION_TARGET",
  "CLEAR_COMPOSITION_TARGET",
  "SET_OVERLAY_STATE",
  "MOVE_POSE_TARGET",
  "SET_ANATOMICAL_DOF",
  "SET_BODY_FRAME_TARGET",
  "CHOOSE_IK_BRANCH",
  "SET_BODY_PARAMETER",
  "SET_SUPPORT_REQUEST",
  "MOVE_PHONE",
  "ROTATE_PHONE",
  "SET_PHONE_AUTHORITY",
  "SET_GRIP_RELATION",
  "SET_CAMERA_FOV",
  "SET_CAMERA_CALIBRATION",
  "SET_FINAL_CROP",
  "PAN_OUTER_FRAME",
  "PAN_APPARATUS",
  "SET_MIRROR_DISTANCE",
  "SET_MIRROR_APERTURE",
  "PAN_MIRROR_WINDOW",
  "PAN_REFLECTED_CONTENT",
  "SET_MIRROR_DISTANCE_AUTOSOLVE",
  "REQUEST_MIRROR_FIT",
  "SET_DRIVER",
  "SET_PRESERVE_SET",
  "SET_SOLVE_FREEDOMS",
  "SET_RELATION_LOCK",
  "SET_TARGET_TOLERANCE",
  "SET_CONTENT_Q",
  "SET_PRINT_GALLERY_MODE",
  "SET_RECURSION_PARAMETER",
  "SET_RECURSION_POLE_POLICY",
  "SET_VIEW_TRAVERSAL",
  "DOLLY_APPARATUS_DEPTH",
  "ZOOM_TO_PORTAL",
  "EXPORT_IMAGE",
  "CREATE_PROPOSAL",
  "ACCEPT_PROPOSAL",
  "REJECT_PROPOSAL",
  "SAVE_SNAPSHOT",
  "LOAD_SNAPSHOT",
  "UNDO",
  "REDO",
  "SET_WORKSPACE_MODE",
  "SET_SELECTION",
];

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

function driverOf(name, payload, composition) {
  if (name === "SET_DRIVER") return payload.driver || payload.mode || composition.driver;
  if (name === "MOVE_PHONE" || name === "ROTATE_PHONE") return "phone";
  if (name === "MOVE_POSE_TARGET" || name === "SET_ANATOMICAL_DOF" || name === "SET_BODY_FRAME_TARGET") return "pose";
  if (name === "SET_MIRROR_DISTANCE" || name === "PAN_MIRROR_WINDOW" || name === "SET_MIRROR_APERTURE") return "mirror";
  if (name === "SET_CAMERA_FOV" || name === "PAN_OUTER_FRAME") return "camera";
  if (name === "SET_CONTENT_Q") return "content_q";
  if (name === "SET_PRINT_GALLERY_MODE" || name === "SET_RECURSION_PARAMETER") return "recursion";
  return composition.driver || composition.solve_mode;
}

function tagEdit(next, name, payload) {
  next.workspace.last_edit = {
    action: name,
    driver: driverOf(name, payload, next.composition),
    preserve: (next.composition.active_preserve_set || []).slice(),
    allowed_to_move: (next.composition.solve_freedoms || []).slice(),
  };
}

export function applyAction(requested, name, payload = {}) {
  if (name === "ROTATE" + "_MIRROR") {
    return { requested, error: "mirror rotation is not a production action" };
  }
  const next = cloneState(requested);
  switch (name) {
    case "SET_PRINT_GALLERY_MODE":
      next.recursion.mode = payload.mode;
      break;
    case "SET_VIEW_TRAVERSAL":
      next.view.tau = payload.tau;
      break;
    case "DOLLY_APPARATUS_DEPTH":
      next.view.tau = Math.max(0, Math.min(1, payload.s ?? payload.tau ?? 0));
      break;
    case "ZOOM_TO_PORTAL":
      next.view.tau = payload.tau ?? 2;
      break;
    case "MOVE_PHONE":
      next.phone.transform_request.translation = payload.translation.slice();
      break;
    case "ROTATE_PHONE":
      Object.assign(next.phone.transform_request, payload);
      break;
    case "SET_MIRROR_DISTANCE":
      next.apparatus.mirror_distance_request_m = payload.d_M;
      break;
    case "SET_MIRROR_APERTURE":
      if (payload.width_m != null) next.mirror.width_m = payload.width_m;
      if (payload.height_m != null) next.mirror.height_m = payload.height_m;
      break;
    case "PAN_MIRROR_WINDOW":
      next.apparatus.mirror_pan_uv_request_m = payload.uv.slice();
      break;
    case "PAN_APPARATUS":
      next.apparatus.apparatus_pan_request_m = payload.pan.slice();
      break;
    case "PAN_OUTER_FRAME":
      next.camera.crop_request.pan = payload.pan;
      break;
    case "PAN_REFLECTED_CONTENT":
      next.body.pose_targets.root.translation[0] += payload.delta?.[0] || 0;
      next.body.pose_targets.root.translation[2] += payload.delta?.[1] || 0;
      break;
    case "SET_CAMERA_FOV":
      next.camera.hfov_request = payload.hfov;
      break;
    case "SET_MIRROR_DISTANCE_AUTOSOLVE":
      next.apparatus.mirror_distance_auto_solve = !!payload.on;
      break;
    case "SET_PHONE_AUTHORITY":
      next.phone.authority = payload.authority;
      break;
    case "CHOOSE_IK_BRANCH":
      next.body.ik_branches[payload.chain] = payload.branch;
      break;
    case "SET_ANATOMICAL_DOF": {
      const joint = payload.joint;
      if (payload.quat) {
        next.body.pose_targets.bend_tilt_twist[joint] = payload.quat;
      } else {
        const bend = payload.bend || 0;
        const tilt = payload.tilt || 0;
        const twist = payload.twist || 0;
        next.body.pose_targets.btt_euler = next.body.pose_targets.btt_euler || {};
        next.body.pose_targets.btt_euler[joint] = { bend, tilt, twist };
        next.body.pose_targets.bend_tilt_twist[joint] = anatomicalQuat(bend, tilt, twist);
      }
      break;
    }
    case "SET_BODY_FRAME_TARGET":
      next.body.pose_targets.root = { ...next.body.pose_targets.root, ...payload };
      break;
    case "SET_SUPPORT_REQUEST":
      next.body.support_request = { ...next.body.support_request, ...payload };
      break;
    case "SET_CONTENT_Q":
      Object.assign(next.content_q, payload);
      break;
    case "SET_RECURSION_PARAMETER":
      Object.assign(next.recursion, payload);
      break;
    case "SET_OVERLAY_STATE":
      next.workspace.overlays[payload.id] = payload.on;
      break;
    case "SET_WORKSPACE_MODE":
      next.workspace.mode = payload.mode;
      break;
    case "SET_SELECTION":
      next.workspace.selection = payload.selection;
      break;
    case "SET_DRIVER":
      if (payload.mode) next.composition = applySolveMode(next, payload.mode).composition;
      next.composition.driver = payload.driver || payload.mode || next.composition.driver;
      if (payload.preserve) next.composition.active_preserve_set = payload.preserve;
      if (payload.freedoms) next.composition.solve_freedoms = payload.freedoms;
      break;
    case "SET_PRESERVE_SET":
      next.composition.active_preserve_set = payload.preserve || [];
      break;
    case "SET_SOLVE_FREEDOMS":
      next.composition.solve_freedoms = payload.freedoms || [];
      break;
    case "LOAD_P0_PROFILE":
      next.reference.active_profile = "P0";
      break;
    case "SET_REFERENCE_REGISTRATION":
      Object.assign(next.reference.registration, payload);
      break;
    case "SET_GRIP_RELATION":
      Object.assign(next.phone.grip_relation, payload);
      break;
    case "SET_CAMERA_CALIBRATION":
      next.camera.calibration_id = payload.id;
      next.camera.epistemic_status = payload.epistemic_status || "CALIBRATED";
      if (payload.record) next.camera.calibration_record = payload.record;
      break;
    case "SET_FINAL_CROP":
      Object.assign(next.camera.crop_request, payload);
      break;
    case "SET_BODY_PARAMETER":
      Object.assign(next.body.definition, payload);
      break;
    case "SET_COMPOSITION_TARGET":
      next.composition.targets = next.composition.targets.filter((t) => t.id !== payload.id);
      next.composition.targets.push(payload);
      break;
    case "CLEAR_COMPOSITION_TARGET":
      next.composition.targets = next.composition.targets.filter((t) => t.id !== payload.id);
      break;
    case "SET_TARGET_TOLERANCE":
      for (const t of next.composition.targets) if (t.id === payload.id) t.tolerance = payload.tolerance;
      break;
    case "SET_RELATION_LOCK":
      next.apparatus.mirror_rotation_relation = payload.relation || "PARALLEL_TO_PHONE";
      break;
    case "SET_RECURSION_POLE_POLICY":
      next.recursion.pole_policy = payload.policy;
      break;
    case "MOVE_POSE_TARGET":
      next.body.pose_targets.endpoint_targets[payload.end] = payload.world;
      break;
    case "LOAD_REFERENCE":
      if (payload.source_id) next.reference.source_id = payload.source_id;
      if (payload.landmarks) next.reference.landmarks = payload.landmarks;
      if (payload.registration) Object.assign(next.reference.registration, payload.registration);
      break;
    case "REQUEST_MIRROR_FIT":
      next.workspace.pending_mirror_fit = true;
      break;
    case "CREATE_PROPOSAL":
      next.workspace.proposal = createProposal({
        id: payload.id || "proposal",
        kind: payload.kind || "GENERIC",
        description: payload.description || "",
        patch: payload.patch || {},
      });
      break;
    case "ACCEPT_PROPOSAL": {
      const p = payload.proposal || next.workspace.proposal;
      if (p) {
        applyPatch(next, p.patch);
        p.status = "ACCEPTED";
        next.workspace.proposal = p;
      }
      next.workspace.pending_mirror_fit = false;
      break;
    }
    case "REJECT_PROPOSAL":
      if (next.workspace.proposal) next.workspace.proposal.status = "REJECTED";
      next.workspace.pending_mirror_fit = false;
      break;
    default:
      break;
  }
  tagEdit(next, name, payload);
  return { requested: next };
}

export { createProposal, acceptProposal, rejectProposal, setPath };
