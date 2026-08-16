import { BONE_PARENT, SEMANTIC } from "../domains/body/skeleton.js";

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

export const PICK_BASE_RADIUS = 0.07;

const PICK_SET = new Set(PICK_JOINTS);

const GLB_TO_SEM = Object.fromEntries(Object.entries(SEMANTIC).map(([k, v]) => [v, k]));

function semanticParent(id) {
  const glb = SEMANTIC[id];
  if (!glb) return null;
  const pGlb = BONE_PARENT[glb];
  return pGlb ? GLB_TO_SEM[pGlb] || null : null;
}

export function pickRadiusForJoint(id, fk) {
  const p = fk?.[id];
  if (!p) return PICK_BASE_RADIUS;
  let nearest = null;
  for (const child of PICK_JOINTS) {
    if (semanticParent(child) !== id) continue;
    const c = fk[child];
    if (!c) continue;
    const d = Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]);
    if (nearest === null || d < nearest) nearest = d;
  }
  if (nearest === null) return PICK_BASE_RADIUS;
  return Math.min(0.09, Math.max(0.04, nearest * 0.35));
}

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
