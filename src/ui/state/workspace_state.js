export const EDITOR_VIEWS = ["CAMERA", "FRONT", "SIDE", "TOP", "ISO"];

export function createWorkspaceState() {
  return {
    room: "POSE",
    editor_view: "ISO",
    selected: null,
    precision: false,
    inspect: false,
    overlays: {
      GRID: true,
      BBOX: false,
      CENTROID: false,
      MEASURE: false,
      PERSPECTIVE: false,
      CORRESPONDENCE: false,
      VISIBILITY: false,
      APPARATUS: true,
      RECURSION: true,
      DISTORTION: false,
    },
    drive_mode: "PHONE_DRIVES_HAND",
    warp: "AUTO",
    q: 1,
    n: 0,
    inset_swapped: false,
    body_mode: "RIGGED",
    axis: "BEND",
  };
}
