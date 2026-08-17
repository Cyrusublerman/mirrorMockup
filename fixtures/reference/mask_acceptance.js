// Independent ACC-MSK-01 fixture. The 3D production inputs and expected
// semantic raster are declared separately so MaskRender cannot pass by comparing
// its own output with itself.

export const MASK_ACCEPTANCE_VERSION = "v5-mask-acceptance-1";
export const MASK_ACCEPTANCE_ID = "ACC-MSK-01-INDEPENDENT-V5";

const W = 200;
const H = 200;

function ellipse(labels, cx, cy, rx, ry, code) {
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(W - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) labels[y * W + x] = code;
  }
}

function rect(labels, x0, y0, x1, y1, code) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) labels[y * W + x] = code;
}

export function maskAcceptanceFixture() {
  const labels = new Uint8Array(W * H);

  // Expected final-image raster, independently declared in pixels.
  rect(labels, 10, 10, 190, 190, 4);
  ellipse(labels, 100, 80, 5, 6.75, 5);
  ellipse(labels, 130, 120, 3.75, 5.0625, 6);
  rect(labels, 152, 36, 180, 64, 7);
  ellipse(labels, 40, 50, 8, 10.8, 1);
  ellipse(labels, 70, 50, 8, 10.8, 2);
  ellipse(labels, 100, 60, 10, 13.5, 3);
  ellipse(labels, 160, 140, 7.5, 10.125, 3);

  return {
    id: MASK_ACCEPTANCE_ID,
    version: MASK_ACCEPTANCE_VERSION,
    width: W,
    height: H,
    reference_labels: labels,
    contour: {
      layer: "CONTOUR",
      source_layer: "VOLUME",
      regions: [
        { id: "direct_hair", source: "head", kind: "ellipsoid", centre: [-1.2, 2, 1.0], radii: [0.16, 0.16, 0.16] },
        { id: "direct_face", source: "head", kind: "ellipsoid", centre: [-0.6, 2, 1.0], radii: [0.16, 0.16, 0.16] },
        { id: "direct_body", source: "ribcage", kind: "ellipsoid", centre: [0, 2, 0.8], radii: [0.2, 0.2, 0.2] },
        { id: "direct_body", source: "thigh_R", kind: "ellipsoid", centre: [1.2, 2, -0.8], radii: [0.15, 0.15, 0.15] },
      ],
    },
    camera: {
      world: { translation: [0, 0, 0], rotation: [0, 0, 0, 1] },
      basis: { right: [1, 0, 0], up: [0, 0, 1], forward: [0, 1, 0] },
      fx: 100,
      fy: 100,
      cx: 100,
      cy: 100,
      width_px: W,
      height_px: H,
      crop_request: { pan: [0, 0], scale: 1, aspect: 1, width_px: W, height_px: H },
    },
    mirror: {
      centre: [0, 3, 0],
      basis: { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    },
    carrier_p: { quad: [[0.76, 0.18], [0.90, 0.18], [0.90, 0.32], [0.76, 0.32]] },
    mirror_quad: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]],
  };
}
