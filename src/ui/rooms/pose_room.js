export function poseChrome(workspace) {
  return {
    hint: workspace.selected?.kind === "joint"
      ? "Bend / Tilt / Rotate  ·  drag endpoint for IK"
      : "Select a joint or drag a hand / head / foot",
  };
}
