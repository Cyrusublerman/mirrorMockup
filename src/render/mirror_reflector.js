import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { householderAffine, finiteApertureTest } from "../domains/reflection/reflect.js";

function nodeKey(obj) {
  return obj?.userData?.name || obj?.name || "";
}

export class MirrorReflector {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.body = null;
    this.bodyCarrier = null;
    this.bodySource = null;
    this.phone = null;
    this.phoneScreenSrc = null;
    this.stick = null;
    this.simple = null;
    this.contour = null;
    this.clipPlanes = [];
    this._house = new THREE.Matrix4();
    this.representation = "VOLUME";
  }

  attachBody(gltfScene, skeletonClone = cloneSkeleton) {
    if (this.bodyCarrier) this.group.remove(this.bodyCarrier);
    this.bodySource = gltfScene;
    this.body = skeletonClone(gltfScene);
    this.bodyCarrier = new this.THREE.Group();
    this.bodyCarrier.name = "mirror_reflected_body_carrier";
    this.bodyCarrier.add(this.body);
    this.body.traverse((obj) => {
      if (obj.isSkinnedMesh) {
        obj.bindMode = "detached";
        obj.bindMatrixInverse.copy(obj.bindMatrix).invert();
        obj.frustumCulled = false;
      }
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.material = obj.material.clone();
        if (obj.material.color) obj.material.color.multiplyScalar(0.62);
        obj.material.transparent = false;
        obj.material.opacity = 1;
        obj.material.depthWrite = true;
        obj.material.clippingPlanes = this.clipPlanes;
        obj.material.clipShadows = true;
      }
    });
    this.group.add(this.bodyCarrier);
    this.syncBodyPose();
  }

  syncBodyPose(source = this.bodySource, dest = this.body) {
    if (!source || !dest) return;
    const src = new Map();
    source.traverse((obj) => {
      if (obj.isBone) src.set(nodeKey(obj), obj);
    });
    dest.traverse((obj) => {
      if (!obj.isBone) return;
      const s = src.get(nodeKey(obj));
      if (!s) return;
      obj.position.copy(s.position);
      obj.quaternion.copy(s.quaternion);
      obj.scale.copy(s.scale);
    });
    dest.updateMatrixWorld(true);
    dest.traverse((obj) => {
      if (obj.isSkinnedMesh) obj.skeleton?.update?.();
    });
  }

  attachPhone(phoneMesh, screenMesh) {
    if (this.phone) this.group.remove(this.phone);
    this.phone = phoneMesh.clone(true);
    this.phone.material = phoneMesh.material.clone();
    this.phone.material.opacity = 1;
    this.phone.material.transparent = false;
    this.phone.material.clippingPlanes = this.clipPlanes;
    this.phoneScreenSrc = screenMesh;
    this.phone.traverse((obj) => {
      if (obj.material && obj !== this.phone) {
        obj.material = obj.material.clone();
        obj.material.transparent = false;
        obj.material.opacity = 1;
        obj.material.clippingPlanes = this.clipPlanes;
      }
    });
    this.group.add(this.phone);
  }

  attachStick(line) {
    if (this.stick) this.group.remove(this.stick);
    this.stick = line.clone();
    this.stick.material = line.material.clone();
    this.stick.material.clippingPlanes = this.clipPlanes;
    this.group.add(this.stick);
  }

  attachSimple(group) {
    if (this.simple) this.group.remove(this.simple);
    this.simple = group.clone(true);
    this.simple.traverse((obj) => {
      if (obj.material) {
        obj.material = obj.material.clone();
        obj.material.clippingPlanes = this.clipPlanes;
      }
    });
    this.group.add(this.simple);
  }

  attachContour(group) {
    if (this.contour) this.group.remove(this.contour);
    this.contour = group.clone(true);
    this.contour.traverse((obj) => {
      if (obj.material) {
        obj.material = obj.material.clone();
        obj.material.clippingPlanes = this.clipPlanes;
      }
    });
    this.group.add(this.contour);
  }

  setRepresentation(kind) {
    this.representation = kind;
    if (this.bodyCarrier) this.bodyCarrier.visible = kind === "VOLUME";
    if (this.body) this.body.visible = true;
    if (this.stick) this.stick.visible = kind === "GESTURE";
    if (this.simple) this.simple.visible = false;
    if (this.contour) this.contour.visible = kind === "CONTOUR";
  }

  updateClip(effective) {
    const THREE = this.THREE;
    const camC = effective.camera?.world?.translation;
    const mirror = effective.mirror;
    if (!camC || !mirror?.centre || !mirror.basis || !mirror.quad) {
      this.clipPlanes.length = 0;
      return;
    }
    const corners = mirror.quad;
    const C = new THREE.Vector3(...camC);
    const M = new THREE.Vector3(...mirror.centre);
    const n = new THREE.Vector3(...mirror.basis.n);
    const planes = [];
    for (let i = 0; i < 4; i++) {
      const a = new THREE.Vector3(...corners[i]);
      const b = new THREE.Vector3(...corners[(i + 1) % 4]);
      const ab = new THREE.Vector3().subVectors(b, a);
      const ac = new THREE.Vector3().subVectors(C, a);
      const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const inward = new THREE.Vector3().subVectors(M, mid);
      if (normal.dot(inward) < 0) normal.negate();
      planes.push(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, a));
    }
    const keepN = n.clone();
    const toCam = new THREE.Vector3().subVectors(C, M);
    if (keepN.dot(toCam) > 0) keepN.negate();
    planes.push(new THREE.Plane().setFromNormalAndCoplanarPoint(keepN, M));
    this.clipPlanes.length = 0;
    this.clipPlanes.push(...planes);
  }

  insideClip(worldPoint) {
    const v = new this.THREE.Vector3(...worldPoint);
    if (!this.clipPlanes.length) return false;
    return this.clipPlanes.every((p) => p.distanceToPoint(v) >= 0);
  }

  clipAgreesWithAperture(worldPoint, effective) {
    const vis = finiteApertureTest(worldPoint, effective.camera.world.translation, effective.mirror);
    return vis.visible === this.insideClip(worldPoint);
  }

  applyHouseholder(src, dstCarrier, centre, n) {
    src.updateMatrixWorld(true);
    const H = householderAffine(centre, n);
    this._house.set(
      H[0], H[1], H[2], H[3],
      H[4], H[5], H[6], H[7],
      H[8], H[9], H[10], H[11],
      H[12], H[13], H[14], H[15],
    );
    dstCarrier.matrixAutoUpdate = false;
    dstCarrier.matrix.copy(this._house).multiply(src.matrixWorld);
    dstCarrier.updateMatrixWorld(true);
    dstCarrier.visible = src.visible;
  }

  syncCloneGeometry(src, dst) {
    if (!src || !dst) return;
    while (dst.children.length > src.children.length) dst.remove(dst.children[dst.children.length - 1]);
    for (let i = 0; i < src.children.length; i++) {
      const s = src.children[i];
      let d = dst.children[i];
      if (!d) {
        d = s.clone();
        if (d.material) {
          d.material = d.material.clone();
          d.material.clippingPlanes = this.clipPlanes;
        }
        dst.add(d);
      }
      if (s.geometry) d.geometry = s.geometry;
      if (s.material && d.material) d.material.clippingPlanes = this.clipPlanes;
      d.position.copy(s.position);
      d.quaternion.copy(s.quaternion);
      d.scale.copy(s.scale);
      d.visible = s.visible;
    }
  }

  update(effective, sources) {
    this.updateClip(effective);
    const M = effective.mirror?.centre;
    const n = effective.mirror?.basis?.n;
    if (!M || !n) return;

    if (this.body && this.bodyCarrier && sources.bodyRoot) {
      this.syncBodyPose(sources.bodyGltf || this.bodySource, this.body);
      this.applyHouseholder(sources.bodyRoot, this.bodyCarrier, M, n);
      this.body.traverse((obj) => {
        if (obj.isSkinnedMesh) obj.skeleton?.update?.();
      });
    }
    if (this.phone && sources.phoneMesh) {
      if (this.phoneScreenSrc) {
        const child = this.phone.children[0];
        if (child && this.phoneScreenSrc.geometry) child.geometry = this.phoneScreenSrc.geometry;
      }
      this.phone.geometry = sources.phoneMesh.geometry;
      this.applyHouseholder(sources.phoneMesh, this.phone, M, n);
    }
    if (this.stick && sources.stick) {
      this.stick.geometry = sources.stick.geometry;
      this.applyHouseholder(sources.stick, this.stick, M, n);
    }
    if (this.simple && sources.simple) {
      this.syncCloneGeometry(sources.simple, this.simple);
      this.applyHouseholder(sources.simple, this.simple, M, n);
    }
    if (this.contour && sources.contour) {
      this.syncCloneGeometry(sources.contour, this.contour);
      this.applyHouseholder(sources.contour, this.contour, M, n);
    }
    this.setRepresentation(this.representation);
  }
}
