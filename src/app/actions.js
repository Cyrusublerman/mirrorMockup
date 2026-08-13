import { cloneState } from "../scene/requested_state.js";
import { applySolveMode } from "../scene/solve_policy.js";
import { createProposal, acceptProposal, rejectProposal } from "../scene/proposals.js";

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
    case "SET_ANATOMICAL_DOF":
      next.body.pose_targets.bend_tilt_twist[payload.joint] = payload.quat;
      break;
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
    case "SET_PRESERVE_SET":
    case "SET_SOLVE_FREEDOMS":
      next.composition = applySolveMode(next, payload.mode || next.composition.solve_mode).composition;
      if (payload.preserve) next.composition.active_preserve_set = payload.preserve;
      if (payload.freedoms) next.composition.solve_freedoms = payload.freedoms;
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
    default:
      break;
  }
  return { requested: next };
}

export { createProposal, acceptProposal, rejectProposal, setPath };
