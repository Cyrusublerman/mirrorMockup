export const REPRESENTATION_LAYERS = Object.freeze(["GESTURE", "VOLUME", "CONTOUR"]);
export const NUMERIC_FRAMES = Object.freeze(["PARENT", "ANATOMICAL", "HEAD", "MIRROR", "IMAGE", "WORLD"]);

export function createWorkspaceState() {
  return {
    phase: "DECLARE",
    output_mode: "FINAL_CAMERA",
    editor_view: "ISO",
    selected: null,
    precision: false,
    inspect: false,
    menu: false,
    overlays: {
      GRID: false,
      BBOX: false,
      CENTROID: false,
      MEASURE: false,
      PERSPECTIVE: false,
      CORRESPONDENCE: false,
      VISIBILITY: false,
      APPARATUS: true,
      RECURSION: false,
      DISTORTION: false,
    },
    drive_mode: "PHONE_DRIVES_HAND",
    warp: "OFF",
    q: 1,
    n: 1,
    axis: "BEND",
    body_mode: "VOLUME",
    input_mode: "VIEWPORT",
    crop_mode: "FINAL_CROP",
    family: "direct-dominant",
    numeric_frame: "PARENT",
  };
}
