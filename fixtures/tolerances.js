export const TOLERANCE_SET_VERSION = "v1";

export const T = Object.freeze({
  "T-LANDMARK": { value: 0.0005, unit: "IMAGE_NORM", source: "3 dp landmarks; S-12" },
  "T-ELBOW": { value: 132.95, unit: "deg", source: "audit verified to 2 dp" },
  "T-HOMO": { value: 1e8, unit: "condition", source: "carrier_p S-17 freeze" },
  "T-CR": { value: 5.5e-11, unit: "1", source: "kernel Cauchy–Riemann" },
  "T-DETJ": { value: 0, unit: "detJ", source: "fold if det J <= 0" },
  "T-GABS": { value: 22.5836845286, unit: "1", source: "published |γ|" },
  "T-GARG": { value: 157.6255960832, unit: "deg", source: "published arg γ" },
  "T-S": { value: 256, unit: "1", source: "kernel S" },
  "T-MOCC": { value: 0.23765, unit: "frame_area", source: "S-04 0.485×0.490" },
  "T-HOCC": { value: 0.225, unit: "frame_area", source: "S-04" },
  "T-BOCC": { value: 0.068, unit: "frame_area", source: "S-04" },
  "T-POCC": { value: 0.0016, unit: "frame_area", source: "S-04" },
  "T-CW": { value: 0.034, unit: "frame_width", source: "S-15" },
  "T-ANK": { value: 0.02, unit: "frame", source: "S-10 ankle–aperture" },
  "T-LEG": { value: 12, unit: "px", source: "S-15 worked example" },
  "T-AMOD": { value: 0.5, unit: "1", source: "S-15 |a|" },
  "T-PHONE": { value: [0.727, 0.1115], unit: "IMAGE_NORM", source: "P0 phone bbox_centre" },
  "T-MIR": { value: [0.6725, 0.3], unit: "IMAGE_NORM", source: "P0 mirror bbox_centre" },
  "T-DM-BOUNDS": { value: [0.25, 8], unit: "m", source: "CODE_PRESENT existing clamp" },
  "T-BONE-REG": { value: 0.005, unit: "m", source: "Phase 1 rendered vs FK" },
  "T-CLIP": { value: 1e-4, unit: "m", source: "aperture clip vs finiteApertureTest" },
  "T-CAPTURE-PX": { value: 2, unit: "px", source: "preview vs export projection" },
  "T-FEA-E": { value: 0.13, unit: "m", source: "v5 G05 e floor" },
  "T-PQ-ANGLE": { value: 75, unit: "deg", source: "v5 D17 front-facing limit" },
  "T-PQ-PX": { value: 16, unit: "px2", source: "v5 D17 footprint" },
  "T-PQ-BEZEL": { value: 0.002, unit: "IMAGE_NORM", source: "v5 D17 bezel" },
  "T-MSK-IOU": { value: 0.5, unit: "1", source: "v5 ACC-MSK-01 floor" },
});

export function t(id) {
  return T[id].value;
}

export function toleranceSetHash() {
  return `${TOLERANCE_SET_VERSION}:${Object.keys(T).sort().join(",")}`;
}

export function minCarrierPx(N, a = t("T-AMOD"), legible = t("T-LEG")) {
  const n = Math.max(1, N | 0);
  return legible / Math.pow(Math.abs(a) || t("T-AMOD"), n - 1);
}

export default T;
