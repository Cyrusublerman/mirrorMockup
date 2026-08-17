function copy(p) { return p ? p.slice() : null; }
function capsule(id, a, b, radius) {
  if (!a || !b) return null;
  return { id, kind: "capsule", a: copy(a), b: copy(b), radius, front_side: true };
}

export class VolumeMannequin {
  update(fk) {
    const parts = {};
    if (fk?.head) parts.head = { id: "head", kind: "ellipsoid", centre: copy(fk.head), radii: [0.085, 0.105, 0.115], front_side: true };
    if (fk?.ribcage) parts.ribcage = { id: "ribcage", kind: "egg", centre: copy(fk.ribcage), radii: [0.16, 0.11, 0.23], front_side: true };
    if (fk?.pelvis) parts.pelvis = { id: "pelvis", kind: "bucket", centre: copy(fk.pelvis), radii: [0.15, 0.12, 0.14], front_side: true };

    const links = [
      ["upper_arm_R", fk?.shoulder_R, fk?.elbow_R, 0.055],
      ["forearm_R", fk?.elbow_R, fk?.wrist_R, 0.045],
      ["upper_arm_L", fk?.shoulder_L, fk?.elbow_L, 0.055],
      ["forearm_L", fk?.elbow_L, fk?.wrist_L, 0.045],
      ["thigh_R", fk?.hip_R, fk?.knee_R, 0.075],
      ["shin_R", fk?.knee_R, fk?.ankle_R, 0.055],
      ["thigh_L", fk?.hip_L, fk?.knee_L, 0.075],
      ["shin_L", fk?.knee_L, fk?.ankle_L, 0.055],
      ["spine_mass_link", fk?.pelvis, fk?.ribcage, 0.09],
    ];
    for (const [id, a, b, r] of links) {
      const part = capsule(id, a, b, r);
      if (part) parts[id] = part;
    }
    return {
      layer: "VOLUME",
      source_layer: "GESTURE",
      parts,
      exportable: false,
      jobs: ["solving", "reach", "support", "occlusion"],
    };
  }
}
