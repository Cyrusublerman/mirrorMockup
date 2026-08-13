import landmarks from "../../fixtures/P0/landmarks.json" with { type: "json" };

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
    },
    body: {
      definition: {
        stature: 1.727,
        provenance: "ARTIST_CHOSEN",
        epistemic_status: "PROVISIONAL",
        glb: "fixtures/P0/base_female_rigged.glb",
      },
      pose_targets: {
        family: "P0",
        root: { translation: [0, 0.85, 0.02], yaw: Math.PI },
        bend_tilt_twist: {},
        endpoint_targets: {},
      },
      ik_branches: { arm_R: 1, arm_L: 1, leg_R: 1, leg_L: 1 },
      support_request: { contacts: ["heel_L", "heel_R"], floor_z: 0 },
    },
    phone: {
      transform_request: {
        translation: [0.12, 0.55, 1.48],
        yaw: 0,
        pitch: 0,
        roll: 0,
      },
      authority: "PHONE_DRIVES_HAND",
      grip_relation: { offset: [0, 0, 0], rotation: [0, 0, 0, 1] },
      body_dimensions_m: { width: 0.071, height: 0.147, depth: 0.008 },
      screen_inset_m: { left: 0.003, right: 0.003, top: 0.004, bottom: 0.008 },
    },
    camera: {
      calibration_id: null,
      hfov_request: (70 * Math.PI) / 180,
      crop_request: { aspect: 3 / 4, width_px: 1170, height_px: 1560, pan: [0, 0] },
      optical_offset_local: [0, 0.055, 0.004],
      epistemic_status: "HYPOTHESIS",
    },
    apparatus: {
      mirror_rotation_relation: "PARALLEL_TO_PHONE",
      mirror_distance_request_m: 1.55,
      mirror_pan_uv_request_m: [0.18, 0.12],
      apparatus_pan_request_m: [0, 0],
      mirror_distance_auto_solve: true,
      preserved_reflected_phone_ratio: 0.0045,
    },
    mirror: {
      width_m: 0.62,
      height_m: 0.88,
      aperture_shape: "rect",
      fit_margin_m: 0.02,
      thickness_m: 0.008,
    },
    composition: {
      targets: [],
      active_preserve_set: ["apparatus_rotation", "support"],
      solve_freedoms: ["pose", "mirror_distance", "phone"],
      solve_mode: SOLVE_MODE.P0_RECONSTRUCT,
    },
    content_q: {
      fill_mode: "cover",
      scale: 1,
      offset: [0, 0],
      rotation: 0,
      crop: { x: 0, y: 0, w: 1, h: 1 },
    },
    recursion: {
      mode: "OFF",
      q: 1,
      n: 1,
      source_period: 256,
      source_rotation: 0,
      phase: [0, 0],
      singularity_policy: "disk",
      pole_policy: "portal_fixed_point",
    },
    view: {
      tau: 0,
      warp_visible: true,
    },
    workspace: {
      mode: "POSE",
      selection: null,
      overlays: { REFERENCE: true, SKELETON: true, PHONE: true, MIRROR: true, P: true },
    },
  };
}

export function cloneState(s) {
  return structuredClone(s);
}
