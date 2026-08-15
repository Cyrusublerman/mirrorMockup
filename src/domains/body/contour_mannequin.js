export class ContourMannequin {
  update(fk) {
    const ids = ["head", "ribcage", "pelvis", "wrist_L", "wrist_R", "ankle_L", "ankle_R"];
    const rings = ids.map((id) => (fk?.[id] ? { id, centre: fk[id].slice() } : null)).filter(Boolean);
    return { layer: "C", rings, exportable: true };
  }
}
