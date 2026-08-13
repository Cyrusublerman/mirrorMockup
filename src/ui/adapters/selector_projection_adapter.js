function visOf(reports, name) {
  const r = reports?.[name]?.reflected;
  if (!r) return 0;
  return r.visible ? 1 : 0;
}

function residualValue(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v.residual === "number") return v.residual;
  return 0;
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
    P = {
      u0: Math.min(...us),
      v0: Math.min(...vs),
      u1: Math.max(...us),
      v1: Math.max(...vs),
      quad,
      valid: !!p.valid,
    };
  }
  const residuals = {};
  for (const [k, v] of Object.entries(e.residuals || {})) residuals[k] = residualValue(v);
  for (const c of e.constraints || []) {
    if (c.constraint_id) residuals[c.constraint_id] = residualValue(c);
  }
  const rec = e.recursion || {};
  const cert = rec.certificate || null;
  const b = app.build || {};
  const reasons = [];
  if (rec.refused) reasons.push(...(rec.reasons || ["P invalid — AUTO refused"]));
  if (!p.valid) reasons.push(...(p.reasons || ["carrier_p"]));
  if (e.transaction === "FAIL") reasons.push("transaction FAIL");
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
    },
    residuals,
    valid: e.transaction !== "FAIL" && p.valid !== false,
    reasons,
    occlusion: {
      ...(vis.occlusion || {}),
      hand_visibility: visOf(reports, "wrist_R"),
      face_visibility: visOf(reports, "head"),
    },
    last_edit: e.last_edit,
    compensation: e.compensation,
    build: {
      APP: b.app,
      UI: b.ui,
      CORE: b.core,
      commit: b.commit,
    },
    requested: r,
    effective: e,
  };
}
