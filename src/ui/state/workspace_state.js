export function createWorkspaceState() {
  return {
    room: "POSE",
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
    body_mode: "RIGGED",
    input_mode: "VIEWPORT",
  };
}
