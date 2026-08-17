import { cropWindow, captureToFinal } from "../domains/camera/crop.js";
import { pinholeProject, imageNormFromPx, vfovFromHfov } from "../shared_math/projection.js";

export const EDITOR_LAYER = 1;

export { vfovFromHfov };

export function letterboxRect(paneW, paneH, aspect) {
  const pane = paneW / paneH;
  if (pane > aspect) {
    const h = paneH;
    const w = h * aspect;
    return { x: (paneW - w) / 2, y: 0, w, h };
  }
  const w = paneW;
  const h = w / aspect;
  return { x: 0, y: (paneH - h) / 2, w, h };
}

export class CaptureCamera {
  constructor(THREE) {
    this.THREE = THREE;
    this.cam = new THREE.PerspectiveCamera(50, 3 / 4, 0.02, 40);
    this.cam.layers.disable(EDITOR_LAYER);
    this.mode = "FINAL_CROP";
  }

  apply(eff) {
    const c = eff.camera;
    if (!c?.world?.translation || !c.basis?.forward || !c.basis?.up) return this.cam;
    this.cam.position.set(...c.world.translation);
    this.cam.up.set(...c.basis.up).normalize();
    const target = new this.THREE.Vector3(
      c.world.translation[0] + c.basis.forward[0],
      c.world.translation[1] + c.basis.forward[1],
      c.world.translation[2] + c.basis.forward[2],
    );
    // Three cameras look down local -Z. The physical camera model defines its optical
    // axis explicitly as basis.forward, so construct the render orientation from that
    // basis rather than reusing the phone quaternion (whose +Y is screen/camera forward).
    this.cam.lookAt(target);

    const W = c.width_px || 1170;
    const H = c.height_px || 1560;
    const hfov = c.hfov || Math.PI / 3;
    const vfov = vfovFromHfov(hfov, W, H);
    this.cam.fov = (vfov * 180) / Math.PI;
    this.cam.aspect = W / H;
    const crop = c.crop_request;
    if (this.mode === "FINAL_CROP" && crop) {
      const win = cropWindow(crop);
      this.cam.setViewOffset(W, H, win.ox * W, win.oy * H, win.w * W, win.h * H);
      this.cam.aspect = (win.w * W) / (win.h * H);
    } else {
      this.cam.clearViewOffset();
    }
    this.cam.updateProjectionMatrix();
    this.cam.updateMatrixWorld(true);
    this.cam.layers.disable(EDITOR_LAYER);
    return this.cam;
  }

  projectFinal(worldPoint, eff) {
    const c = eff.camera;
    const p = pinholeProject(
      worldPoint,
      c.world.translation,
      c.basis.right,
      c.basis.up,
      c.basis.forward,
      c.fx,
      c.fy,
      c.cx,
      c.cy,
    );
    if (!p.valid) return null;
    const capture = imageNormFromPx(p.u, p.v, c.width_px, c.height_px);
    const yDown = [capture[0], 1 - capture[1]];
    if (this.mode === "FULL_SENSOR") return yDown;
    return captureToFinal(yDown, c.crop_request);
  }
}
