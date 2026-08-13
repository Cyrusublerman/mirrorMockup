export function evaluateSupport(fk, requested) {
  const z0 = requested.body.support_request.floor_z;
  const reports = [];
  for (const c of requested.body.support_request.contacts) {
    const key = c.startsWith("heel_L") ? "ankle_L" : c.startsWith("heel_R") ? "ankle_R" : c;
    const p = fk[key];
    if (!p) continue;
    const pen = z0 - p[2];
    reports.push({
      contact: c,
      z: p[2],
      penetration: pen,
      state: pen > 1e-4 ? "PROJECTED" : "PASS",
    });
  }
  return { floor_z: z0, reports };
}
