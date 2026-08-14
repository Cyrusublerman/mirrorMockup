import { cropWindow } from "../domains/camera/crop.js";
import { pinholeProject, imageNormFromPx } from "../shared_math/projection.js";
import { captureToFinal } from "../domains/camera/crop.js";

export const EDITOR_LAYER = 1;

export function verticalFovFromHorizontal(hfov, widthPx, heightPx) {
  return 2 * Math.atan((heightPx / widthPx) * Math.tan(hfov / 2));
}

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
    if (!c?.world?.translation || !c.world.rotation) return this.cam;
    this.cam.position.set(...c.world.translation);
    this.cam.quaternion.set(c.world.rotation[0], c.world.rotation[1], c.world.rotation[2], c.world.rotation[3]);
    if (c.basis?.up) this.cam.up.set(...c.basis.up);
    const W = c.width_px || 1170;
    const H = c.height_px || 1560;
    const hfov = c.hfov || Math.PI / 3;
    const vfov = verticalFovFromHorizontal(hfov, W, H);
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
