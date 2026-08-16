function visOf(reports, name) {
  const r = reports?.[name]?.reflected;
  if (!r) return 0;
  return r.visible ? 1 : 0;
}

function residualValue(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v.residual === "number") return v.residual;
  return null;
}

function meaningfulCompensation(comp, tol = 1e-6) {
  if (!comp) return null;
  if (!Number.isFinite(comp.from) || !Number.isFinite(comp.to)) return comp;
  return Math.abs(comp.to - comp.from) > tol ? comp : null;
}

export function projectForHud(app) {
  const r = app.getRequested();
  const e = app.getEffective();
  const vis = e.visibility || {};
  const reports = vis.reports || {};
  const p = e.carrier_p || {};
  const quad = p.quad;
  let P = null;
  if (Array.isArray(quad) && quad.every((c) => c && Number.isFinite(c[0]))) {
    const us = quad.map((c) => c[0]);
    const vs = quad.map((c) => c[1]);
    P = { u0: Math.min(...us), v0: Math.min(...vs), u1: Math.max(...us), v1: Math.max(...vs), quad, valid: !!p.valid };
  }
  const residualNums = {};
  for (const [k, v] of Object.entries(e.residuals || {})) residualNums[k] = residualValue(v);
  for (const c of e.constraints || []) if (c.constraint_id) residualNums[c.constraint_id] = residualValue(c);
  const targets = (r.composition?.targets || []).map((t) => {
    const row = e.residuals?.[t.id] || {};
    return {
      id: t.id,
      class: t.hard_or_soft || "soft",
      tolerance: t.tolerance,
      bbox: t.bbox,
      requested: row.requested || t.target,
      effective: row.effective || null,
      residual: typeof row.residual === "number" ? row.residual : null,
      weight: t.weight_if_soft,
      weight_origin: t.weight_origin,
      frame: row.frame || t.frame || "FINAL_CROP",
    };
  });
  const rec = e.recursion || {};
  const cert = rec.certificate || null;
  const b = app.build || {};
  const reasons = [];
  if (rec.refused) reasons.push(...(rec.reasons || ["P invalid — AUTO refused"]));
  if (!p.valid) reasons.push(...(p.reasons || ["carrier_p"]));
  if (e.transaction === "FAIL") reasons.push("transaction FAIL");
  if (e.transaction === "PROJECTED") {
    const list = e.constraints || [];
    const c = list.find((x) => x.state === "PROJECTED" && String(x.constraint_id).startsWith("target_")) || list.find((x) => x.state === "PROJECTED");
    if (c) reasons.push(`${c.constraint_id} ${c.reason || "PROJECTED"}`.trim());
  }
  const transactionCompensation = meaningfulCompensation(e.compensation);
  return {
    pose: e.skeleton,
    phone: e.phone,
    camera: e.camera,
    mirror: e.mirror,
    portal: { P, Q: e.content_q, valid: !!p.valid },
    rec: {
      ...rec,
      S: cert?.S,
      alpha: cert?.alpha,
      detJ: cert?.detJ_probe,
      no_fold: cert?.no_fold,
      pole: cert?.pole,
      p_log: rec.p_log || cert?.p_log,
      p_fix: rec.p_fix || cert?.p_fix,
      output_repeat: rec.output_repeat || cert?.output_repeat || cert?.gamma_abs,
      loop_state: rec.loop_state,
      certificate_kind: rec.certificate_kind,
    },
    residuals: residualNums,
    targets,
    valid: e.transaction === "PASS",
    reasons,
    occlusion: {
      ...(vis.occlusion || {}),
      hand_visibility: visOf(reports, "wrist_R"),
      face_visibility: visOf(reports, "head"),
    },
    last_edit: e.last_edit,
    compensation: transactionCompensation,
    transaction_compensation: transactionCompensation,
    feasible: e.feasible,
    aperture_band: e.aperture_band,
    occlusion_intent: e.occlusion_intent,
    screen_gates: e.carrier_p?.gates,
    arm_seven: e.arm_seven,
    mask: e.mask,
    phone_scale: e.phone_scale,
    volume: e.volume,
    contour: e.contour,
    epistemic: {
      camera: r.camera?.epistemic_status || "HYPOTHESIS",
      body: r.body?.definition?.epistemic_status || "PROVISIONAL",
      phone: r.phone?.width_epistemic || "ASSUMED",
    },
    transaction_actions: {
      keep() {
        const c = transactionCompensation;
        if (!c || !Number.isFinite(c.to)) return;
        app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false }, { label: "Keep compensation" });
        app.dispatch("SET_MIRROR_DISTANCE", { d_M: c.to }, { label: "Keep compensation" });
      },
      release() {
        app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false }, { label: "Release compensation lock" });
      },
      revert() {
        app.dispatch("UNDO");
      },
    },
    build: { APP: b.app, UI: b.ui, CORE: b.core, commit: b.commit },
    requested: r,
    effective: e,
  };
}
