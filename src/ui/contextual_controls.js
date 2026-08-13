const OVERLAY_IDS = ["REFERENCE", "SKELETON", "PHONE", "MIRROR", "P"];
const SOLVE_MODES = [
  "POSE_FIRST",
  "PHONE_FIRST",
  "MIRROR_RATIO_FIRST",
  "COMPOSITION_FIT",
  "P0_RECONSTRUCT",
  "MANUAL",
];
const AUTHORITIES = ["PHONE_DRIVES_HAND", "HAND_DRIVES_PHONE"];
const BTT_JOINTS = ["spine", "head", "shoulder_R"];

function jp(obj) {
  return JSON.stringify(obj);
}

function num(v, d = 3) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

function deg(rad) {
  return num((Number(rad) * 180) / Math.PI, 2);
}

function overlayToggles(requested) {
  if (requested.workspace.mode !== "INSPECT") {
    return `<div class="panel"><p>selection ${requested.workspace.selection || "—"} · overlays follow selection</p></div>`;
  }
  const o = requested.workspace.overlays || {};
  return `<div class="panel">
      <h3>Overlays</h3>
      ${OVERLAY_IDS.map((id) => {
        const on = !!o[id];
        return `<label>${id} <input type="checkbox" data-action="SET_OVERLAY_STATE" data-payload='${jp({ id, on })}' ${on ? "checked" : ""}></label>`;
      }).join("")}
    </div>`;
}

function panAbsolute(action, key, labelA, labelB, a, b) {
  const va = Number(a) || 0;
  const vb = Number(b) || 0;
  const step = 0.01;
  return `
      <label>${labelA} <input data-num="${action}" data-vec="0" type="number" step="${step}" value="${va}"></label>
      <label>${labelB} <input data-num="${action}" data-vec="1" type="number" step="${step}" value="${vb}"></label>
      <p>
        <button type="button" data-action="${action}" data-payload='${jp({ [key]: [va - step, vb] })}'>−${labelA}</button>
        <button type="button" data-action="${action}" data-payload='${jp({ [key]: [va + step, vb] })}'>+${labelA}</button>
        <button type="button" data-action="${action}" data-payload='${jp({ [key]: [va, vb - step] })}'>−${labelB}</button>
        <button type="button" data-action="${action}" data-payload='${jp({ [key]: [va, vb + step] })}'>+${labelB}</button>
        <button type="button" data-action="${action}" data-payload='${jp({ [key]: [va, vb] })}'>apply</button>
      </p>`;
}

function panReflectedContent() {
  const step = 0.02;
  return `
      <label>Δx <input data-num="PAN_REFLECTED_CONTENT" data-vec="0" type="number" step="0.01" value="0"></label>
      <label>Δz <input data-num="PAN_REFLECTED_CONTENT" data-vec="1" type="number" step="0.01" value="0"></label>
      <p>
        <button type="button" data-action="PAN_REFLECTED_CONTENT" data-payload='${jp({ delta: [-step, 0] })}'>−x</button>
        <button type="button" data-action="PAN_REFLECTED_CONTENT" data-payload='${jp({ delta: [step, 0] })}'>+x</button>
        <button type="button" data-action="PAN_REFLECTED_CONTENT" data-payload='${jp({ delta: [0, -step] })}'>−z</button>
        <button type="button" data-action="PAN_REFLECTED_CONTENT" data-payload='${jp({ delta: [0, step] })}'>+z</button>
      </p>`;
}

function posePanel(requested) {
  const r = requested.body.pose_targets.root;
  const def = requested.body.definition;
  const auth = requested.phone.authority;
  const euler = requested.body.pose_targets.btt_euler || {};
  const btt = BTT_JOINTS.map((j) => {
    const e = euler[j] || { bend: 0, tilt: 0, twist: 0 };
    return `<p>${j}
      <label>Bend <input data-num="SET_ANATOMICAL_DOF" data-joint="${j}" data-field="bend" type="number" step="0.02" value="${num(e.bend, 3)}"></label>
      <label>Tilt <input data-num="SET_ANATOMICAL_DOF" data-joint="${j}" data-field="tilt" type="number" step="0.02" value="${num(e.tilt, 3)}"></label>
      <label>Twist <input data-num="SET_ANATOMICAL_DOF" data-joint="${j}" data-field="twist" type="number" step="0.02" value="${num(e.twist, 3)}"></label>
    </p>`;
  }).join("");
  return `
      <div class="panel">
        <h3>Pose</h3>
        <p>
          <button type="button" data-action="SET_SELECTION" data-payload='${jp({ selection: "body" })}'>select body</button>
        </p>
        <p>rig ${def.glb.split("/").pop()}</p>
        <p>stature ${num(def.stature, 3)} m · ${def.provenance}</p>
        <label>root x <input data-num="SET_BODY_FRAME_TARGET" data-field="x" type="number" step="0.01" value="${r.translation[0]}"></label>
        <label>root y <input data-num="SET_BODY_FRAME_TARGET" data-field="y" type="number" step="0.01" value="${r.translation[1]}"></label>
        <label>root z <input data-num="SET_BODY_FRAME_TARGET" data-field="z" type="number" step="0.01" value="${r.translation[2]}"></label>
        <label>yaw deg <input data-num="SET_BODY_FRAME_TARGET" data-field="yaw_deg" type="number" step="1" value="${((r.yaw * 180) / Math.PI).toFixed(1)}"></label>
        <label>arm_R branch <input data-num="CHOOSE_IK_BRANCH" data-field="branch" type="number" step="2" value="${requested.body.ik_branches.arm_R}"></label>
        <label>authority
          <select data-action="SET_PHONE_AUTHORITY" data-field="authority">
            ${AUTHORITIES.map((a) => `<option value="${a}" ${a === auth ? "selected" : ""}>${a}</option>`).join("")}
          </select>
        </label>
        <h3>Bend / Tilt / Twist</h3>
        ${btt}
      </div>`;
}

function scenePanel(requested) {
  const t = requested.phone.transform_request.translation;
  const uv = requested.apparatus.mirror_pan_uv_request_m || [0, 0];
  const ap = requested.apparatus.apparatus_pan_request_m || [0, 0];
  const cropPan = requested.camera.crop_request.pan || [0, 0];
  return `
      <div class="panel">
        <h3>Phone / mirror</h3>
        <p>
          <button type="button" data-action="SET_SELECTION" data-payload='${jp({ selection: "phone" })}'>select phone</button>
          <button type="button" data-action="SET_SELECTION" data-payload='${jp({ selection: "mirror" })}'>select mirror</button>
        </p>
        <label>phone x <input data-num="MOVE_PHONE" data-vec="0" type="number" step="0.01" value="${t[0]}"></label>
        <label>phone y <input data-num="MOVE_PHONE" data-vec="1" type="number" step="0.01" value="${t[1]}"></label>
        <label>phone z <input data-num="MOVE_PHONE" data-vec="2" type="number" step="0.01" value="${t[2]}"></label>
        <label>d_M <input data-num="SET_MIRROR_DISTANCE" data-field="d_M" type="number" step="0.01" value="${requested.apparatus.mirror_distance_request_m}"></label>
        <label>aperture W <input data-num="SET_MIRROR_APERTURE" data-field="width_m" type="number" step="0.01" value="${requested.mirror.width_m}"></label>
        <label>aperture H <input data-num="SET_MIRROR_APERTURE" data-field="height_m" type="number" step="0.01" value="${requested.mirror.height_m}"></label>
        <label>HFOV deg <input data-num="SET_CAMERA_FOV" data-field="hfov_deg" type="number" step="0.5" value="${((requested.camera.hfov_request * 180) / Math.PI).toFixed(1)}"></label>
        <h3>PAN_MIRROR_WINDOW</h3>
        ${panAbsolute("PAN_MIRROR_WINDOW", "uv", "u", "v", uv[0], uv[1])}
        <h3>PAN_APPARATUS</h3>
        ${panAbsolute("PAN_APPARATUS", "pan", "x", "y", ap[0], ap[1])}
        <h3>PAN_OUTER_FRAME</h3>
        ${panAbsolute("PAN_OUTER_FRAME", "pan", "x", "y", cropPan[0], cropPan[1])}
        <h3>PAN_REFLECTED_CONTENT</h3>
        ${panReflectedContent()}
        <p><button type="button" data-action="REQUEST_MIRROR_FIT" data-payload="{}">REQUEST_MIRROR_FIT</button></p>
      </div>`;
}

function compositionPanel(requested, effective) {
  const mode = requested.composition.solve_mode;
  const residuals = effective.residuals || {};
  const rows = Object.entries(residuals)
    .map(([id, r]) => `<tr><td>${id}</td><td>${num(r.residual, 4)}</td><td>${num(r.tolerance, 3)}</td></tr>`)
    .join("");
  return `
      <div class="panel">
        <h3>Composition</h3>
        <label>solve_mode
          <select data-action="SET_DRIVER" data-field="mode">
            ${SOLVE_MODES.map((m) => `<option value="${m}" ${m === mode ? "selected" : ""}>${m}</option>`).join("")}
          </select>
        </label>
        <table>
          <tr><td>id</td><td>residual</td><td>tol</td></tr>
          ${rows || "<tr><td colspan='3'>none</td></tr>"}
        </table>
      </div>`;
}

function recursionPanel(requested, effective) {
  const rec = effective.recursion || {};
  const c = rec.certificate;
  const reasons = rec.reasons?.length ? rec.reasons.join(" · ") : rec.refused ? "refused" : "—";
  const pole = c?.pole ? c.pole.map((x) => num(x, 3)).join(", ") : "—";
  const q = requested.content_q;
  return `
      <div class="panel">
        <h3>Recursion</h3>
        <p>mode ${rec.mode} · req ${requested.recursion.mode}</p>
        <p>available ${rec.available} · refused ${!!rec.refused}</p>
        <p>reasons ${reasons}</p>
        <p>γ ${c ? `|${num(c.gamma_abs, 4)}| arg ${deg(c.gamma_arg)}°` : "—"}</p>
        <p>pole ${pole}</p>
        <label>q <input data-num="SET_RECURSION_PARAMETER" data-field="q" type="number" value="${requested.recursion.q}"></label>
        <label>n <input data-num="SET_RECURSION_PARAMETER" data-field="n" type="number" value="${requested.recursion.n}"></label>
        <label>S <input data-num="SET_RECURSION_PARAMETER" data-field="source_period" type="number" value="${requested.recursion.source_period}"></label>
        <p>τ segment ${effective.view.segment} · τ ${num(effective.view.tau, 3)}</p>
        <label>Q scale <input data-num="SET_CONTENT_Q" data-field="scale" type="number" step="0.01" value="${q.scale}"></label>
        <label>Q ox <input data-num="SET_CONTENT_Q" data-field="offset" data-vec="0" type="number" step="0.01" value="${q.offset[0]}"></label>
        <label>Q oy <input data-num="SET_CONTENT_Q" data-field="offset" data-vec="1" type="number" step="0.01" value="${q.offset[1]}"></label>
      </div>`;
}

function inspectPanel(requested, effective) {
  const rows = (effective.constraints || [])
    .map(
      (c) =>
        `<tr><td>${c.constraint_id}</td><td>${c.state}</td><td>${num(c.residual, 4)}</td></tr>`,
    )
    .join("");
  const reqDm = requested.apparatus.mirror_distance_request_m;
  const effDm = effective.apparatus?.d_M;
  const reqHfov = requested.camera.hfov_request;
  const effHfov = effective.camera?.hfov;
  const p = effective.carrier_p || {};
  const warpReq = requested.recursion.mode;
  const warpEff = effective.recursion?.mode;
  const proposal = effective.proposal;
  return `
      <div class="panel">
        <h3>Inspect</h3>
        <p>transaction ${effective.transaction}</p>
        <table>
          <tr><td>id</td><td>state</td><td>residual</td></tr>
          ${rows || "<tr><td colspan='3'>none</td></tr>"}
        </table>
        <p>d_M req ${num(reqDm, 3)} · eff ${num(effDm, 3)}</p>
        <p>compensate ${effective.compensation ? `${effective.compensation.variable} ${num(effective.compensation.from, 3)}→${num(effective.compensation.to, 3)} ${effective.compensation.reason}` : "none"}</p>
        <p>last driver ${effective.last_edit?.driver || "—"} · allowed ${effective.allowed_to_move?.join(",") || "—"}</p>
        <p>hfov req ${reqHfov != null ? `${deg(reqHfov)}°` : "—"} · eff ${effHfov != null ? `${deg(effHfov)}°` : "—"}</p>
        <p>P ${p.valid ? "valid" : "invalid"} ${((p.reasons || [])).join("|") || ""}</p>
        <p>warp req ${warpReq} · eff ${warpEff} · available ${effective.recursion?.available}</p>
        <p>warp req ${warpReq} · eff ${warpEff} · available ${effective.recursion?.available}</p>
        ${proposal ? `<p>proposal ${proposal.id} ${proposal.status} ${proposal.kind || ""}</p>
        <p>
          <button type="button" data-action="ACCEPT_PROPOSAL" data-payload="{}">ACCEPT_PROPOSAL</button>
          <button type="button" data-action="REJECT_PROPOSAL" data-payload="{}">REJECT_PROPOSAL</button>
        </p>` : ""}
      </div>`;
}

export function renderContext(requested, effective) {
  let body = "";
  if (requested.workspace.mode === "POSE") body = posePanel(requested);
  else if (requested.workspace.mode === "SCENE") body = scenePanel(requested);
  else if (requested.workspace.mode === "COMPOSITION") body = compositionPanel(requested, effective);
  else if (requested.workspace.mode === "RECURSION") body = recursionPanel(requested, effective);
  else if (requested.workspace.mode === "INSPECT") body = inspectPanel(requested, effective);
  else {
    const sel = requested.workspace.selection || requested.workspace.mode;
    body = `<div class="panel"><h3>${sel}</h3></div>`;
  }
  return body + overlayToggles(requested);
}
