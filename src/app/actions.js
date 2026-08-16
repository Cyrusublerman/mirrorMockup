import { cloneState } from "../scene/requested_state.js";
import { applySolveMode } from "../scene/solve_policy.js";
import { createProposal, acceptProposal, rejectProposal, applyPatch } from "../scene/proposals.js";
import { anatomicalQuat } from "../domains/body/skeleton.js";
import { familyIntent } from "../domains/composition/family.js";
import { PHASES, INPUT_MODES, OUTPUT_MODES } from "../ui/state/phase_state.js";

export const ACTION_NAMES = [
  "LOAD_P0_PROFILE", "LOAD_REFERENCE", "SET_REFERENCE_REGISTRATION",
  "SET_COMPOSITION_TARGET", "CLEAR_COMPOSITION_TARGET", "SET_OVERLAY_STATE",
  "MOVE_POSE_TARGET", "SET_ANATOMICAL_DOF", "SET_ARM_SEVEN", "SET_TORSO_BOXES",
  "SET_BODY_FRAME_TARGET", "CHOOSE_IK_BRANCH", "SET_BODY_PARAMETER", "SET_SUPPORT_REQUEST",
  "MOVE_PHONE", "ROTATE_PHONE", "SET_PHONE_AUTHORITY", "SET_GRIP_RELATION",
  "SET_PHONE_WIDTH_MEASUREMENT", "SET_PHONE_SCALE_POLICY", "SET_PHONE_SCALE",
  "SET_CAMERA_FOV", "SET_CAMERA_CALIBRATION", "SET_TOPOLOGY", "SET_FINAL_CROP", "PAN_OUTER_FRAME",
  "PAN_APPARATUS", "SET_MIRROR_DISTANCE", "SET_MIRROR_APERTURE", "PAN_MIRROR_WINDOW",
  "PAN_REFLECTED_CONTENT", "SET_MIRROR_DISTANCE_AUTOSOLVE", "REQUEST_MIRROR_FIT",
  "SET_DRIVER", "SET_PRESERVE_SET", "SET_SOLVE_FREEDOMS", "SET_RELATION_LOCK",
  "SET_TARGET_TOLERANCE", "SET_TARGET_WEIGHT", "SET_LOCK_CHIP", "SET_OCCLUSION_INTENT",
  "SET_COMPOSITION_FAMILY", "SET_PHASE", "SET_OUTPUT_MODE", "SET_INPUT_MODE",
  "SET_P0_OCCUPANCY_CONVENTION", "SET_HEAD_SILHOUETTE_RADIUS",
  "SET_MIRROR_HEIGHT", "SET_POSE_SEED", "SET_ARM_SWIVEL", "EXPORT_MASK",
  "SET_MIRROR_FRAME_AUTHORITY", "SET_CONTENT_Q", "SET_PRINT_GALLERY_MODE",
  "SET_RECURSION_PARAMETER", "SET_RECURSION_POLE_POLICY", "SET_VIEW_TRAVERSAL",
  "DOLLY_APPARATUS_DEPTH", "ZOOM_TO_PORTAL", "EXPORT_IMAGE", "EXPORT_FINAL_CAMERA",
  "EXPORT_STAGING_PRESCRIPTION", "EXPORT_COMPOSITION_OVERLAY", "EXPORT_REFERENCE_RENDER",
  "CREATE_PROPOSAL", "ACCEPT_PROPOSAL", "REJECT_PROPOSAL", "SAVE_SNAPSHOT", "LOAD_SNAPSHOT",
  "UNDO", "REDO", "SET_WORKSPACE_MODE", "SET_SELECTION",
];

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

function driverOf(name, payload, composition) {
  if (name === "SET_DRIVER") return payload.driver || payload.mode || composition.driver;
  if (["MOVE_PHONE", "ROTATE_PHONE", "SET_PHONE_SCALE"].includes(name)) return "phone";
  if (["MOVE_POSE_TARGET", "SET_ANATOMICAL_DOF", "SET_ARM_SEVEN", "SET_TORSO_BOXES", "SET_BODY_FRAME_TARGET"].includes(name)) return "pose";
  if (["SET_MIRROR_DISTANCE", "PAN_MIRROR_WINDOW", "SET_MIRROR_APERTURE"].includes(name)) return "mirror";
  if (["SET_CAMERA_FOV", "PAN_OUTER_FRAME"].includes(name)) return "camera";
  if (name === "SET_CONTENT_Q") return "content_q";
  if (["SET_PRINT_GALLERY_MODE", "SET_RECURSION_PARAMETER"].includes(name)) return "recursion";
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

function setEuler(next, joint, bend, tilt, twist) {
  next.body.pose_targets.btt_euler ||= {};
  next.body.pose_targets.btt_euler[joint] = { bend, tilt, twist };
  next.body.pose_targets.bend_tilt_twist[joint] = anatomicalQuat(bend, tilt, twist);
}

export function applyAction(requested, name, payload = {}) {
  if (name === "ROTATE" + "_MIRROR") return { requested, error: "mirror rotation is not a production action" };
  const next = cloneState(requested);
  switch (name) {
    case "SET_PRINT_GALLERY_MODE": next.recursion.mode = payload.mode; break;
    case "SET_VIEW_TRAVERSAL": next.view.tau = payload.tau; break;
    case "DOLLY_APPARATUS_DEPTH": next.view.tau = Math.max(0, Math.min(1, payload.s ?? payload.tau ?? 0)); break;
    case "ZOOM_TO_PORTAL": next.view.tau = payload.tau ?? 2; break;
    case "MOVE_PHONE": next.phone.transform_request.translation = payload.translation.slice(); break;
    case "ROTATE_PHONE": Object.assign(next.phone.transform_request, payload); break;
    case "SET_MIRROR_DISTANCE":
      next.apparatus.mirror_distance_request_m = payload.d_M;
      next.apparatus.apply_distance_request = true;
      break;
    case "SET_MIRROR_APERTURE":
      if (payload.width_m != null) next.mirror.width_m = payload.width_m;
      if (payload.height_m != null) next.mirror.height_m = payload.height_m;
      break;
    case "PAN_MIRROR_WINDOW": {
      const prev = requested.apparatus.mirror_pan_uv_request_m || [0, 0];
      const uv = payload.uv.slice();
      next.apparatus.mirror_pan_uv_request_m = uv;
      if (next.mirror.frame_authority === "WORLD" && next.mirror.world_pose?.translation) {
        next.mirror.world_pose.translation[0] += uv[0] - prev[0];
        next.mirror.world_pose.translation[2] += uv[1] - prev[1];
      }
      break;
    }
    case "PAN_APPARATUS": {
      const prev = requested.apparatus.apparatus_pan_request_m || [0, 0];
      const pan = payload.pan.slice();
      next.phone.transform_request.translation[0] += pan[0] - prev[0];
      next.phone.transform_request.translation[2] += pan[1] - prev[1];
      next.apparatus.apparatus_pan_request_m = pan;
      break;
    }
    case "PAN_OUTER_FRAME": next.camera.crop_request.pan = payload.pan; next.camera.crop_request.authored = true; break;
    case "PAN_REFLECTED_CONTENT": next.composition.reflected_content_delta = payload.delta.slice(); break;
    case "SET_CAMERA_FOV": next.camera.hfov_request = payload.hfov; break;
    case "SET_MIRROR_DISTANCE_AUTOSOLVE": next.apparatus.mirror_distance_auto_solve = !!payload.on; break;
    case "SET_PHONE_AUTHORITY":
      next.phone.authority = payload.authority;
      if (payload.authority === "LOCK_GRIP") next.composition.locks.GRIP = true;
      break;
    case "CHOOSE_IK_BRANCH": next.body.ik_branches[payload.chain] = payload.branch; break;
    case "SET_ANATOMICAL_DOF": {
      const joint = payload.joint;
      if (payload.quat) next.body.pose_targets.bend_tilt_twist[joint] = payload.quat;
      else setEuler(next, joint, payload.bend || 0, payload.tilt || 0, payload.twist || 0);
      break;
    }
    case "SET_ARM_SEVEN": {
      if (!payload.world || payload.world.length !== 3) return { requested, error: "SET_ARM_SEVEN requires a world wrist target" };
      next.body.pose_targets.endpoint_targets.wrist_R = payload.world.slice();
      next.body.pose_targets.swivel.arm_R = payload.swivel || 0;
      setEuler(next, "wrist_R", payload.wrist_bend || 0, payload.wrist_tilt || 0, payload.wrist_rotate || 0);
      break;
    }
    case "SET_TORSO_BOXES": {
      const p = payload.pelvis || {};
      const r = payload.ribcage || {};
      setEuler(next, "pelvis", p.lean || 0, p.tilt || 0, p.yaw || 0);
      setEuler(next, "ribcage", r.lean || 0, r.tilt || 0, r.yaw || 0);
      next.body.pose_targets.gaze = "MIRROR";
      break;
    }
    case "SET_BODY_FRAME_TARGET": next.body.pose_targets.root = { ...next.body.pose_targets.root, ...payload }; break;
    case "SET_SUPPORT_REQUEST": next.body.support_request = { ...next.body.support_request, ...payload }; break;
    case "SET_CONTENT_Q": Object.assign(next.content_q, payload); break;
    case "SET_RECURSION_PARAMETER": Object.assign(next.recursion, payload); break;
    case "SET_OVERLAY_STATE": next.workspace.overlays[payload.id] = payload.on; break;
    case "SET_WORKSPACE_MODE": next.workspace.mode = payload.mode; break;
    case "SET_SELECTION": next.workspace.selection = payload.selection; break;
    case "SET_DRIVER":
      if (payload.mode) next.composition = applySolveMode(next, payload.mode).composition;
      next.composition.driver = payload.driver || payload.mode || next.composition.driver;
      if (payload.preserve) next.composition.active_preserve_set = payload.preserve;
      if (payload.freedoms) next.composition.solve_freedoms = payload.freedoms;
      if (payload.mode === "P0_RECONSTRUCT") next.camera.crop_request.authored = false;
      break;
    case "SET_PRESERVE_SET": next.composition.active_preserve_set = payload.preserve || []; break;
    case "SET_SOLVE_FREEDOMS": next.composition.solve_freedoms = payload.freedoms || []; break;
    case "LOAD_P0_PROFILE": next.reference.active_profile = "P0"; next.camera.crop_request.authored = false; break;
    case "SET_REFERENCE_REGISTRATION": Object.assign(next.reference.registration, payload); break;
    case "SET_GRIP_RELATION": Object.assign(next.phone.grip_relation, payload); break;
    case "SET_CAMERA_CALIBRATION":
      next.camera.calibration_id = payload.id;
      next.camera.epistemic_status = payload.epistemic_status || "CALIBRATED";
      if (payload.record) next.camera.calibration_record = payload.record;
      break;
    case "SET_TOPOLOGY":
      if (!["FRONT_CAMERA_SELFIE", "CAMERA_BETWEEN"].includes(payload.topology)) return { requested, error: "unknown topology" };
      next.camera.topology_request = payload.topology;
      next.camera.topology_epistemic = "DECLARED";
      break;
    case "SET_PHONE_WIDTH_MEASUREMENT":
      if (!(payload.width_m > 0)) return { requested, error: "phone width must be measured in metres" };
      next.phone.body_dimensions_m.width = payload.width_m;
      next.phone.width_epistemic = "MEASURED";
      break;
    case "SET_PHONE_SCALE_POLICY":
      if (!["UNRESOLVED", "SOLVED", "INDEPENDENT"].includes(payload.policy)) return { requested, error: "invalid phone-scale policy" };
      next.composition.phone_scale_policy = payload.policy;
      if (payload.policy !== "SOLVED") next.composition.phone_scale_request = null;
      break;
    case "SET_PHONE_SCALE":
      if (next.composition.phone_scale_policy !== "SOLVED") return { requested, error: "phone scale policy unresolved or independent" };
      next.composition.phone_scale_request = payload.f;
      break;
    case "SET_P0_OCCUPANCY_CONVENTION":
      if (!["SILHOUETTE", "BBOX"].includes(payload.convention)) return { requested, error: "occupancy must be declared SILHOUETTE or BBOX" };
      next.reference.p0_occupancy_convention = payload.convention;
      break;
    case "SET_HEAD_SILHOUETTE_RADIUS":
      if (!(payload.radius_m > 0)) return { requested, error: "head silhouette radius must be positive" };
      next.reference.head_silhouette_radius_m = payload.radius_m;
      break;
    case "SET_FINAL_CROP": Object.assign(next.camera.crop_request, payload); next.camera.crop_request.authored = true; break;
    case "SET_BODY_PARAMETER": Object.assign(next.body.definition, payload); break;
    case "SET_COMPOSITION_TARGET": next.composition.targets = next.composition.targets.filter((t) => t.id !== payload.id); next.composition.targets.push(payload); break;
    case "CLEAR_COMPOSITION_TARGET": next.composition.targets = next.composition.targets.filter((t) => t.id !== payload.id); break;
    case "SET_TARGET_TOLERANCE": for (const t of next.composition.targets) if (t.id === payload.id) t.tolerance = payload.tolerance; break;
    case "SET_RELATION_LOCK": next.apparatus.mirror_rotation_relation = payload.relation || "PARALLEL_TO_PHONE"; break;
    case "SET_RECURSION_POLE_POLICY": next.recursion.pole_policy = payload.policy; break;
    case "SET_TARGET_WEIGHT":
      for (const t of next.composition.targets) if (t.id === payload.id) { t.weight_if_soft = payload.weight; t.weight_origin = payload.origin || "ARTIST"; }
      break;
    case "SET_COMPOSITION_FAMILY": next.composition.family = payload.family; next.composition.occlusion_intent = familyIntent(payload.family); break;
    case "SET_PHASE": {
      const phase = payload.phase || payload.mode;
      if (!PHASES.includes(phase)) return { requested, error: `unknown phase ${phase}` };
      next.workspace.phase = phase;
      next.workspace.mode = phase;
      break;
    }
    case "SET_OUTPUT_MODE":
      if (!OUTPUT_MODES.includes(payload.mode)) return { requested, error: `unknown output ${payload.mode}` };
      next.workspace.output_mode = payload.mode;
      if (payload.mode === "RECURSION") next.recursion.mode = next.recursion.mode === "OFF" ? "AUTO" : next.recursion.mode;
      if (payload.mode === "FINAL_CAMERA") next.recursion.mode = "OFF";
      break;
    case "SET_INPUT_MODE":
      if (!INPUT_MODES.includes(payload.mode)) return { requested, error: `unknown input ${payload.mode}` };
      next.workspace.input_mode = payload.mode;
      break;
    case "SET_MIRROR_HEIGHT":
      if (next.mirror.world_pose?.translation) next.mirror.world_pose.translation[2] = payload.z;
      else next.apparatus.mirror_pan_uv_request_m = [next.apparatus.mirror_pan_uv_request_m[0], payload.z];
      break;
    case "SET_POSE_SEED": {
      const seeds = { STAND: { translation: [0, 0.85, 0.02], yaw: Math.PI }, TWIST: { translation: [0, 0.85, 0.02], yaw: Math.PI + 0.45 }, KNEEL: { translation: [0, 0.72, 0.02], yaw: Math.PI } };
      const seed = seeds[payload.id];
      if (seed) next.body.pose_targets.root = { ...next.body.pose_targets.root, ...seed };
      if (payload.id === "KNEEL") next.body.support_request.contacts = ["knee_L", "knee_R"];
      if (payload.id === "STAND") next.body.support_request.contacts = ["heel_L", "heel_R"];
      break;
    }
    case "SET_ARM_SWIVEL": next.body.pose_targets.swivel ||= {}; next.body.pose_targets.swivel[payload.chain || "arm_R"] = payload.swivel; break;
    case "SET_OCCLUSION_INTENT":
      next.composition.occlusion_intent ||= {};
      next.composition.occlusion_intent[payload.id] = { state: payload.state, min: payload.min, max: payload.max, allowed_occluders: payload.allowed_occluders || [] };
      break;
    case "SET_LOCK_CHIP":
      next.composition.locks[payload.id] = !!payload.on;
      if (payload.id === "PHONE_AREA") next.apparatus.mirror_distance_auto_solve = !!payload.on;
      if (payload.id === "GRIP" && payload.on) next.phone.authority = "LOCK_GRIP";
      if (payload.id === "SUPPORT") next.body.support_request.pinned = !!payload.on;
      break;
    case "SET_MIRROR_FRAME_AUTHORITY": next.mirror.frame_authority = payload.authority; break;
    case "MOVE_POSE_TARGET":
      next.body.pose_targets.endpoint_targets[payload.end] = payload.world;
      if (payload.orientation) { next.body.pose_targets.endpoint_orientations ||= {}; next.body.pose_targets.endpoint_orientations[payload.end] = payload.orientation; }
      break;
    case "LOAD_REFERENCE":
      if (payload.source_id) next.reference.source_id = payload.source_id;
      if (payload.landmarks) next.reference.landmarks = payload.landmarks;
      if (payload.registration) Object.assign(next.reference.registration, payload.registration);
      break;
    case "REQUEST_MIRROR_FIT": next.workspace.pending_mirror_fit = true; break;
    case "CREATE_PROPOSAL": next.workspace.proposal = createProposal({ id: payload.id || "proposal", kind: payload.kind || "GENERIC", description: payload.description || "", patch: payload.patch || {} }); break;
    case "ACCEPT_PROPOSAL": {
      const p = payload.proposal || next.workspace.proposal;
      if (p) { applyPatch(next, p.patch); p.status = "ACCEPTED"; next.workspace.proposal = p; }
      next.workspace.pending_mirror_fit = false;
      break;
    }
    case "REJECT_PROPOSAL": if (next.workspace.proposal) next.workspace.proposal.status = "REJECTED"; next.workspace.pending_mirror_fit = false; break;
    default: break;
  }
  tagEdit(next, name, payload);
  return { requested: next };
}

export { createProposal, acceptProposal, rejectProposal, setPath };
