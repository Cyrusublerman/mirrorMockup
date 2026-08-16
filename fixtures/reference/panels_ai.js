export const PANELS_AI = Object.freeze({
  A: { mirror: 0.155, direct_body: 0.581, reflected_body: 0.011, d_over_r: 55, direct_face: 0.214, regime: "direct-dominant", convention: "partial", a_m: 0.368, e_m: 0.140, ae_epistemic: "HYPOTHESIS" },
  B: { mirror: 0.473, direct_body: 0.290, reflected_body: 0.002, d_over_r: null, direct_face: 0, regime: "mirror-dominant", convention: "absent", a_m: 0.370, e_m: 0.253, ae_epistemic: "HYPOTHESIS" },
  C: { mirror: 0.064, direct_body: 0.626, reflected_body: 0.016, d_over_r: 39, direct_face: 0, regime: "direct-dominant", convention: "partial", a_m: 0.360, e_m: 0.132, ae_epistemic: "HYPOTHESIS" },
  D: { mirror: 0.354, direct_body: 0.219, reflected_body: 0.195, d_over_r: 1.1, direct_face: 0, regime: "balanced", convention: "applied", a_m: 0.400, e_m: 0.180, ae_epistemic: "HYPOTHESIS" },
  E: { mirror: 0.715, direct_body: 0.138, reflected_body: 0.112, d_over_r: 1.2, direct_face: 0, regime: "mirror-dominant", convention: "applied", a_m: 0.390, e_m: 0.260, ae_epistemic: "HYPOTHESIS" },
  F: { mirror: 0.558, direct_body: 0.271, reflected_body: 0.073, d_over_r: 3.7, direct_face: 0, regime: "mirror-dominant", convention: "applied", a_m: 0.385, e_m: 0.248, ae_epistemic: "HYPOTHESIS" },
  G: { mirror: 0.317, direct_body: 0.102, reflected_body: 0.008, d_over_r: 12, direct_face: 0.005, regime: "mostly-room", convention: "partial", a_m: 0.420, e_m: 0.200, ae_epistemic: "HYPOTHESIS" },
  H: { mirror: 0.111, direct_body: 0.673, reflected_body: 0.038, d_over_r: 18, direct_face: 0.108, regime: "direct-dominant", convention: "applied", a_m: 0.365, e_m: 0.138, ae_epistemic: "HYPOTHESIS" },
  I: { mirror: 0.228, direct_body: 0.502, reflected_body: 0.043, d_over_r: 12, direct_face: 0.114, regime: "direct-dominant", convention: "applied", a_m: 0.368, e_m: 0.145, ae_epistemic: "HYPOTHESIS" },
});

export const PART_WEIGHTS = Object.freeze({
  mirror: 1,
  direct_hair: 1,
  direct_face: 1,
  reflected_torso: 0.45,
  reflected_legs: 0.45,
  reflected_phone: 1.2,
  direct_body: 1,
  reflected_body: 0.45,
});
