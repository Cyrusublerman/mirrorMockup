export function renderContext(requested, effective) {
  const sel = requested.workspace.selection || requested.workspace.mode;
  if (requested.workspace.mode === "RECURSION") {
    return `
      <div class="panel">
        <h3>Recursion</h3>
        <p>mode ${effective.recursion.mode} available ${effective.recursion.available}</p>
        <p>segment ${effective.view.segment}</p>
        <label>q <input data-num="SET_RECURSION_PARAMETER" data-field="q" type="number" value="${requested.recursion.q}"></label>
        <label>n <input data-num="SET_RECURSION_PARAMETER" data-field="n" type="number" value="${requested.recursion.n}"></label>
        <label>S <input data-num="SET_RECURSION_PARAMETER" data-field="source_period" type="number" value="${requested.recursion.source_period}"></label>
      </div>`;
  }
  if (requested.workspace.mode === "POSE") {
    const r = requested.body.pose_targets.root;
    return `
      <div class="panel">
        <h3>Pose</h3>
        <p>rig ${requested.body.definition.glb.split("/").pop()}</p>
        <label>root x <input data-num="SET_BODY_FRAME_TARGET" data-field="x" type="number" step="0.01" value="${r.translation[0]}"></label>
        <label>root y <input data-num="SET_BODY_FRAME_TARGET" data-field="y" type="number" step="0.01" value="${r.translation[1]}"></label>
        <label>root z <input data-num="SET_BODY_FRAME_TARGET" data-field="z" type="number" step="0.01" value="${r.translation[2]}"></label>
        <label>yaw deg <input data-num="SET_BODY_FRAME_TARGET" data-field="yaw_deg" type="number" step="1" value="${(r.yaw * 180 / Math.PI).toFixed(1)}"></label>
        <label>arm_R branch <input data-num="CHOOSE_IK_BRANCH" data-field="branch" type="number" step="2" value="${requested.body.ik_branches.arm_R}"></label>
      </div>`;
  }
  if (requested.workspace.mode === "SCENE") {
    const t = requested.phone.transform_request.translation;
    return `
      <div class="panel">
        <h3>Phone / mirror</h3>
        <label>phone x <input data-num="MOVE_PHONE" data-vec="0" type="number" step="0.01" value="${t[0]}"></label>
        <label>phone y <input data-num="MOVE_PHONE" data-vec="1" type="number" step="0.01" value="${t[1]}"></label>
        <label>phone z <input data-num="MOVE_PHONE" data-vec="2" type="number" step="0.01" value="${t[2]}"></label>
        <label>d_M <input data-num="SET_MIRROR_DISTANCE" data-field="d_M" type="number" step="0.01" value="${requested.apparatus.mirror_distance_request_m}"></label>
        <label>aperture W <input data-num="SET_MIRROR_APERTURE" data-field="width_m" type="number" step="0.01" value="${requested.mirror.width_m}"></label>
        <label>aperture H <input data-num="SET_MIRROR_APERTURE" data-field="height_m" type="number" step="0.01" value="${requested.mirror.height_m}"></label>
        <label>HFOV deg <input data-num="SET_CAMERA_FOV" data-field="hfov_deg" type="number" step="0.5" value="${(requested.camera.hfov_request * 180 / Math.PI).toFixed(1)}"></label>
      </div>`;
  }
  return `
    <div class="panel">
      <h3>${sel}</h3>
      <p>one selection, one overlay</p>
      <p>phone prism ${requested.phone.body_dimensions_m.width.toFixed(3)}×${requested.phone.body_dimensions_m.height.toFixed(3)}×${requested.phone.body_dimensions_m.depth.toFixed(3)} m</p>
      <p>mirror quad ${requested.mirror.width_m.toFixed(2)}×${requested.mirror.height_m.toFixed(2)} m</p>
      <p>body GLB ${requested.body.definition.glb}</p>
    </div>`;
}
