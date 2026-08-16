import landmarks from "../../fixtures/P0/landmarks.js";
import { p0Targets } from "../domains/composition/targets.js";
import { familyIntent } from "../domains/composition/family.js";

export const RELATION = Object.freeze({
  FREE: "FREE",
  LOCKED: "LOCKED",
  RELATION_LOCKED: "RELATION_LOCKED",
  DERIVED: "DERIVED",
  AUTO_SOLVED: "AUTO_SOLVED",
  TARGETED: "TARGETED",
  BOUNDED: "BOUNDED",
  EXPLORATORY: "EXPLORATORY",
});

export const SOLVE_MODE = Object.freeze({
  POSE_FIRST: "POSE_FIRST",
  PHONE_FIRST: "PHONE_FIRST",
  MIRROR_RATIO_FIRST: "MIRROR_RATIO_FIRST",
  COMPOSITION_FIT: "COMPOSITION_FIT",
  P0_RECONSTRUCT: "P0_RECONSTRUCT",
  MANUAL: "MANUAL",
});

export function defaultRequestedState() {
  return {
    reference: {
      source_id: "P0",
      source_hash: null,
      registration: { opacity: 0.35, offset: [0, 0], scale: 1 },
      active_profile: "P0",
      landmarks,
      p0_occupancy_convention: "UNRESOLVED",
      head_silhouette_radius_m: null,
    },
    body: {
      definition: {
        stature: 1.700,
        provenance: "ASSUMED_ANALYSIS_STATION",
        epistemic_status: "HYPOTHESIS",
        glb: "fixtures/P0/base_female_rigged.glb",
        model_adapter: {
          base_height_m: 1.80367625,
          base_height_source: "MEASURED_GLB_GEOMETRY_BOUNDS",
          face_head_extension_ratio: 0.645,
          face_reference_source: "MEASURED_EYE_MESH_CENTRE_RELATIVE_TO_NECK_HEAD_SPAN",
        },
      },
      pose_targets: {
        family: "P0",
        root: { translation: [-0.0065, 0.3971, 0], yaw: Math.PI },
        bend_tilt_twist: {},
        btt_euler: { head: { bend: 0, tilt: 0, twist: 0 }, shoulder_R: { bend: 0, tilt: 0, twist: 0 } },
        endpoint_targets: {},
        gaze: "FREE",
        swivel: { arm_R: 0, arm_L: 0 },
      },
      ik_branches: { arm_R: 1, arm_L: 1, leg_R: 1, leg_L: 1 },
      support_request: { contacts: ["heel_L", "heel_R"], floor_z: 0 },
    },
    phone: {
      transform_request: { translation: [0.140, -0.005, 1.6035], yaw: 0, pitch: 0, roll: 0 },
      authority: "PHONE_DRIVES_HAND",
      grip_relation: {
        offset: [0, 0.105, -0.134459179],
        rotation: [0, 0, 0, 1],
        epistemic_status: "HYPOTHESIS",
        source: "v5 working lever distributed across wrist/grip/phone/camera chain",
      },
      body_dimensions_m: { width: 0.075, height: 0.147, depth: 0.008 },
      width_epistemic: "ASSUMED",
      screen_inset_m: { left: 0.003, right: 0.003, top: 0.004, bottom: 0.008 },
    },
    camera: {
      calibration_id: "HYPOTHESIS_P0_FRONT",
      calibration_record: { kind: "HYPOTHESIS", hfov_deg: 70, principal: "centre", source: "unmeasured P0 image; not a reviewed device record" },
      hfov_request: (70 * Math.PI) / 180,
      crop_request: { aspect: 3 / 4, width_px: 1170, height_px: 1560, pan: [0, 0], scale: 1, authored: false },
      optical_offset_local: [0, 0.005, 0.0615],
      optical_offset_epistemic: "HYPOTHESIS",
      wrist_to_optical_centre_m: 0.22,
      wrist_to_optical_centre_source: "v5 §3 working lever",
      epistemic_status: "HYPOTHESIS",
      topology_request: "FRONT_CAMERA_SELFIE",
      topology_epistemic: "UNRESOLVED",
      external_transform_request: null,
      external_transform_epistemic: "UNRESOLVED",
    },
    apparatus: {
      mirror_rotation_relation: "PARALLEL_TO_PHONE",
      mirror_distance_request_m: 1.540,
      mirror_pan_uv_request_m: [-0.140, -0.265],
      apparatus_pan_request_m: [0, 0],
      mirror_distance_auto_solve: false,
      preserved_reflected_phone_ratio: 0.000375272871873153,
      operating_point_epistemic: "UNRESOLVED",
      working_station: { m_m: 1.200, u_m: 0.340, c_m: 1.540, e_m: 0.140, a_m: 0.368, z_camera_m: 1.665, status: "HYPOTHESIS" },
    },
    mirror: {
      frame_authority: "WORLD",
      world_pose: { translation: [0.000, 1.540, 1.400], rotation: [0, 0, 0, 1] },
      width_m: 0.62,
      height_m: 1.100,
      sill_m: 0.850,
      aperture_shape: "rect",
      fit_margin_m: 0.02,
      thickness_m: 0.008,
      epistemic_status: "HYPOTHESIS",
    },
    composition: {
      targets: p0Targets(),
      active_preserve_set: [],
      solve_freedoms: ["x_decision"],
      solve_mode: SOLVE_MODE.MANUAL,
      driver: "gesture",
      family: "direct-dominant",
      phone_scale_request: null,
      phone_scale_policy: "UNRESOLVED",
      locks: { PHONE_AREA: false, REFLECTED_BODY_SCALE: false, MIRROR_OCCUPANCY: false, SUPPORT: true, GRIP: false, P_VALID: false },
      occlusion_intent: familyIntent("direct-dominant"),
      reflected_content_delta: [0, 0],
    },
    content_q: { fill_mode: "cover", size_basis: "Cover", scale: 1, offset: [0, 0], rotation: 0, crop: { x: 0, y: 0, w: 1, h: 1 } },
    recursion: { mode: "OFF", q: 1, n: 1, source_period: 256, source_rotation: 0, phase: [0, 0], singularity_policy: "disk", pole_policy: "portal_fixed_point", output_repeat: null },
    view: { tau: 0, warp_visible: false },
    workspace: {
      mode: "DECLARE",
      phase: "DECLARE",
      input_mode: "VIEWPORT",
      output_mode: "FINAL_CAMERA",
      selection: null,
      last_edit: null,
      overlays: { REFERENCE: false, SKELETON: false, PHONE: true, MIRROR: true, P: false },
    },
  };
}

export function cloneState(s) {
  return structuredClone(s);
}
