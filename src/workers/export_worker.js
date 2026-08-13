import { exportImage } from "../domains/export/image.js";

self.onmessage = (e) => {
  const { requested, effective, opts, id } = e.data;
  const out = exportImage(requested, effective, opts);
  self.postMessage({ id, sidecar: out.sidecar, png: out.png }, [out.png.buffer]);
};
