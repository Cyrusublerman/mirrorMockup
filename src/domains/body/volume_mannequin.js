export class VolumeMannequin {
  update(fk) {
    const parts = {};
    for (const id of ["pelvis", "ribcage", "head", "shoulder_L", "shoulder_R", "hip_L", "hip_R"]) {
      const p = fk?.[id];
      if (p) parts[id] = { centre: p.slice(), kind: id === "pelvis" ? "bucket" : id === "ribcage" ? "egg" : "primitive" };
    }
    return { layer: "B", parts, exportable: false };
  }
}
