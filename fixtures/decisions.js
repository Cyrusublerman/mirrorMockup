export const DEC = Object.freeze({
  "DEC-OP": {
    value: "ANALYSIS_STATION",
    m_m: 1.2,
    a_m: 0.368,
    e_m: 0.14,
    R: 7.46,
    note: "v5 closed-form station is the declared default. P0_RECONSTRUCT may not violate FeasibleSet.",
  },
  "DEC-F": { value: "SOLVED", note: "requested f propagates into c, hand, elbow" },
  "DEC-TOP": { value: "FRONT_CAMERA_SELFIE", note: "CAMERA_BETWEEN declared-only until a panel shows the phone back" },
  "DEC-P0": { value: "BBOX", note: "landmarks.json occupancy is bbox, not silhouette" },
  "DEC-R": { value: 0.115, unit: "m", note: "head silhouette including hair" },
  "DEC-NAV": { value: "DECLARE_SOLVE_STAGE", note: "§13 phases replace POSE/SCENE/RECURSION" },
});

export function decision(id) {
  return DEC[id];
}
