export const PICK_JOINTS = Object.freeze([
  "pelvis",
  "spine_lower",
  "spine_mid",
  "ribcage",
  "neck",
  "head",
  "clavicle_L",
  "shoulder_L",
  "elbow_L",
  "wrist_L",
  "clavicle_R",
  "shoulder_R",
  "elbow_R",
  "wrist_R",
  "hip_L",
  "knee_L",
  "ankle_L",
  "toe_L",
  "hip_R",
  "knee_R",
  "ankle_R",
  "toe_R",
  "hand_L",
  "hand_R",
]);

export const IK_JOINTS = Object.freeze(["wrist_R", "wrist_L", "ankle_L", "ankle_R"]);

function originalName(obj) {
  return obj.userData?.name || obj.name;
}

export class BoneIndex {
  constructor(gltfScene, semantic) {
    this.semantic = semantic;
    this._byOriginal = new Map();
    gltfScene.traverse((obj) => {
      const key = originalName(obj);
      if (key) this._byOriginal.set(key, obj);
    });
    const misses = [];
    for (const [id, glbName] of Object.entries(semantic)) {
      if (!this._byOriginal.has(glbName)) misses.push(`${id}=${glbName}`);
    }
    if (misses.length) throw new Error(`BoneIndex unresolved: ${misses.join(", ")}`);
  }

  get(semanticId) {
    const glb = this.semantic[semanticId];
    if (!glb) return null;
    return this._byOriginal.get(glb) || null;
  }

  get size() {
    return this._byOriginal.size;
  }

  applyLocals(locals) {
    for (const [name, local] of Object.entries(locals)) {
      const obj = this._byOriginal.get(name);
      if (!obj || obj.isMesh || obj.isSkinnedMesh) continue;
      if (!local) throw new Error(`unresolved bone local for ${name}`);
      obj.position.set(...local.translation);
      obj.quaternion.set(local.rotation[0], local.rotation[1], local.rotation[2], local.rotation[3]);
      obj.scale.set(...local.scale);
    }
    for (const [id, glbName] of Object.entries(this.semantic)) {
      if (!this._byOriginal.get(glbName)) throw new Error(`unresolved bone ${id}=${glbName}`);
    }
  }
}
