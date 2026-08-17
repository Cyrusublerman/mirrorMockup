export const OPEN_DISAGREEMENTS = Object.freeze({
  "DEC-OP": {
    item: "operating point",
    resolved: false,
    source_candidate: { m_m: 0.72, a_m: 0.43, hfov_deg: 55, R: 4.3 },
    analysis_candidate: { m_m: 1.2, a_m: 0.368, hfov_deg: 70, R: 7.46 },
    working_hypothesis: { m_m: 1.2, a_m: 0.368, e_m: 0.14, hfov_deg: 70, R: 7.46 },
    settle: "one measured phone width plus a device HFOV record",
  },
  "DEC-F": {
    item: "phone scale f",
    resolved: false,
    candidates: ["SOLVED", "INDEPENDENT"],
    working_hypothesis: "UNRESOLVED",
    settle: "declare whether the sim sliders are solved or independent",
  },
  "DEC-TOP": {
    item: "B, E, F topology",
    resolved: false,
    candidates: ["FRONT_CAMERA_SELFIE", "CAMERA_BETWEEN"],
    working_hypothesis: "FRONT_CAMERA_SELFIE",
    settle: "check whether any panel shows the phone back",
  },
  "DEC-P0": {
    item: "P0 identity",
    resolved: false,
    candidates: ["SILHOUETTE", "BBOX"],
    working_hypothesis: "UNRESOLVED",
    settle: "state whether occupancy is silhouette or bbox",
  },
  "DEC-R": {
    item: "clearance",
    resolved: false,
    candidates: [
      { label: "hair-included", radius_m: 0.115, clearance_deg: 1.24 },
      { label: "without-hair", radius_m: 0.105, clearance_deg: 4.24 },
    ],
    working_hypothesis: { label: "hair-included", radius_m: 0.115 },
    settle: "declare the silhouette radius used for the head",
  },
});

// Compatibility view for modules that need a working hypothesis while preserving
// the v5 requirement that none of the five disagreements is silently resolved.
export const DEC = Object.freeze(Object.fromEntries(
  Object.entries(OPEN_DISAGREEMENTS).map(([id, row]) => [id, {
    ...row,
    value: row.working_hypothesis,
    epistemic_status: "UNRESOLVED",
  }]),
));

export function decision(id) {
  return DEC[id];
}

export function assertUnresolved(id) {
  const row = OPEN_DISAGREEMENTS[id];
  if (!row) throw new Error(`unknown disagreement ${id}`);
  if (row.resolved) throw new Error(`${id} must remain unresolved until its stated evidence settles it`);
  return row;
}
