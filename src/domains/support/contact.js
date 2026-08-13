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

  const zs = [];
  for (const k of ["toe_L", "toe_R", "ankle_L", "ankle_R"]) {
    if (fk[k]) zs.push(fk[k][2]);
  }
  const plant_delta_z = zs.length ? -Math.min(...zs) + z0 : 0;

  const toeZs = [];
  if (fk.toe_L) toeZs.push(fk.toe_L[2]);
  if (fk.toe_R) toeZs.push(fk.toe_R[2]);
  const planted = toeZs.length > 0 && toeZs.every((z) => Math.abs(z - z0) <= 0.02);

  return {
    floor_z: z0,
    reports,
    plant_delta_z,
    planted,
    plant: { delta_z: plant_delta_z, planted },
  };
}
