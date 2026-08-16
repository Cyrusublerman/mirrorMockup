import { householderAffine, finiteApertureTest } from "../domains/reflection/reflect.js";

export class MirrorReflector {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.body = null;
    this.phone = null;
    this.phoneScreenSrc = null;
    this.stick = null;
    this.simple = null;
    this.clipPlanes = [];
    this._house = new THREE.Matrix4();
  }

  attachBody(gltfScene) {
    if (this.body) this.group.remove(this.body);
    this.body = gltfScene.clone(true);
    this.body.traverse((obj) => {
      if (obj.isSkinnedMesh) obj.bindMode = "detached";
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.material = obj.material.clone();
        obj.material.transparent = true;
        obj.material.opacity = 0.45;
        obj.material.clippingPlanes = this.clipPlanes;
        obj.material.clipShadows = true;
      }
    });
    this.group.add(this.body);
  }

  attachPhone(phoneMesh, screenMesh) {
    if (this.phone) this.group.remove(this.phone);
    this.phone = phoneMesh.clone(true);
    this.phone.material = phoneMesh.material.clone();
    this.phone.material.opacity = 0.55;
    this.phone.material.transparent = true;
    this.phone.material.clippingPlanes = this.clipPlanes;
    this.phoneScreenSrc = screenMesh;
    this.phone.traverse((obj) => {
      if (obj.material && obj !== this.phone) {
        obj.material = obj.material.clone();
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
    if (keepN.dot(toCam) < 0) keepN.negate();
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

  applyHouseholder(src, dst, centre, n) {
    src.updateMatrixWorld(true);
    const H = householderAffine(centre, n);
    this._house.set(H[0], H[1], H[2], H[3], H[4], H[5], H[6], H[7], H[8], H[9], H[10], H[11], H[12], H[13], H[14], H[15]);
    dst.matrixAutoUpdate = false;
    dst.matrix.copy(this._house).multiply(src.matrixWorld);
    dst.updateMatrixWorld(true);
    dst.visible = src.visible;
  }

  update(effective, sources) {
    this.updateClip(effective);
    const M = effective.mirror?.centre;
    const n = effective.mirror?.basis?.n;
    if (!M || !n) return;
    if (this.body && sources.bodyRoot) this.applyHouseholder(sources.bodyRoot, this.body, M, n);
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
      this.stick.visible = sources.stick.visible;
    }
    if (this.simple && sources.simple) {
      this.applyHouseholder(sources.simple, this.simple, M, n);
      this.simple.visible = sources.simple.visible;
    }
  }
}
