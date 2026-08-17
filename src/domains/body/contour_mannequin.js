function clonePart(p) {
  return structuredClone(p);
}

export class ContourMannequin {
  update(volume) {
    if (!volume || volume.layer !== "VOLUME") throw new Error("ContourMannequin requires the VOLUME layer as its source");
    const parts = {};
    const regions = [];
    for (const [id, part] of Object.entries(volume.parts || {})) {
      const p = clonePart(part);
      if (part.kind === "capsule") {
        p.contour = { kind: "capsule_silhouette", a: part.a.slice(), b: part.b.slice(), radius: part.radius };
      } else {
        p.contour = { kind: "elliptic_silhouette", centre: part.centre.slice(), radii: part.radii.slice() };
      }
      parts[id] = p;
    }

    const head = volume.parts?.head;
    if (head) {
      regions.push({ id: "direct_hair", source: "head", kind: "ellipsoid", centre: [head.centre[0], head.centre[1], head.centre[2] + 0.025], radii: [head.radii[0] * 1.06, head.radii[1] * 1.04, head.radii[2] * 0.58] });
      regions.push({ id: "direct_face", source: "head", kind: "ellipsoid", centre: [head.centre[0], head.centre[1] - 0.012, head.centre[2] - 0.025], radii: [head.radii[0] * 0.78, head.radii[1] * 0.72, head.radii[2] * 0.62] });
    }
    for (const id of ["ribcage", "pelvis", "upper_arm_R", "forearm_R", "upper_arm_L", "forearm_L", "thigh_R", "shin_R", "thigh_L", "shin_L"]) {
      const part = volume.parts?.[id];
      if (part) regions.push({ id: "direct_body", source: id, ...clonePart(part) });
    }

    return {
      layer: "CONTOUR",
      source_layer: "VOLUME",
      parts,
      regions,
      exportable: true,
      jobs: ["mask comparison", "guide export"],
    };
  }
}
