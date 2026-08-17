export const DECLARED_MASK_VERSION = "v5-mask-demo-reference-1";
export const DECLARED_MASK_ID = "V5_MASK_DEMO_REFERENCE";

export const MASK_CODE = Object.freeze({
  clear: 0,
  direct_hair: 1,
  direct_face: 2,
  direct_body: 3,
  mirror: 4,
  reflected_torso: 5,
  reflected_legs: 6,
  reflected_phone: 7,
});

function insidePoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / ((b[1] - a[1]) || 1e-12) + a[0]) c = !c;
  }
  return c;
}

function poly(labels, w, h, pts, code, clip = null) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (clip && (x < clip[0] || x >= clip[0] + clip[2] || y < clip[1] || y >= clip[1] + clip[3])) continue;
    if (insidePoly(x + 0.5, y + 0.5, pts)) labels[y * w + x] = code;
  }
}

function ellipse(labels, w, h, cx, cy, rx, ry, code, clip = null) {
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(w - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(h - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (clip && (x < clip[0] || x >= clip[0] + clip[2] || y < clip[1] || y >= clip[1] + clip[3])) continue;
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) labels[y * w + x] = code;
  }
}

function T(tx, ty, s, pts) { return pts.map(([x, y]) => [tx + x * s, ty + y * s]); }

function frontFigure(labels, w, h, tx, ty, s, reflected, clip = null) {
  const body = reflected ? MASK_CODE.reflected_torso : MASK_CODE.direct_body;
  const legs = reflected ? MASK_CODE.reflected_legs : MASK_CODE.direct_body;
  const face = reflected ? MASK_CODE.reflected_torso : MASK_CODE.direct_face;
  const hair = reflected ? MASK_CODE.reflected_torso : MASK_CODE.direct_hair;
  for (const p of [
    [[-26,0],[-24,-170],[-4,-170],[-6,0]],
    [[6,0],[4,-170],[24,-170],[26,0]],
  ]) poly(labels,w,h,T(tx,ty,s,p),legs,clip);
  poly(labels,w,h,T(tx,ty,s,[[-24,-170],[-30,-230],[-26,-284],[26,-284],[30,-230],[24,-170]]),body,clip);
  poly(labels,w,h,T(tx,ty,s,[[24,-276],[58,-310],[66,-300],[30,-264]]),body,clip);
  poly(labels,w,h,T(tx,ty,s,[[-24,-276],[-36,-208],[-26,-206],[-16,-270]]),body,clip);
  poly(labels,w,h,T(tx,ty,s,[[-8,-284],[-8,-300],[8,-300],[8,-284]]),face,clip);
  ellipse(labels,w,h,tx,ty-316*s,19*s,24*s,face,clip);
  poly(labels,w,h,T(tx,ty,s,[[-19,-318],[-19,-344],[0,-344],[19,-344],[19,-318],[0,-330]]),hair,clip);
  poly(labels,w,h,T(tx,ty,s,[[-19,-320],[-27,-300],[-24,-272],[-13,-272],[-14,-322]]),hair,clip);
  poly(labels,w,h,T(tx,ty,s,[[19,-320],[27,-300],[24,-272],[13,-272],[14,-322]]),hair,clip);
  if (reflected) {
    const px = tx + 66*s, py = ty - 300*s;
    poly(labels,w,h,[[px-3*s,py-6*s],[px+4*s,py-6*s],[px+4*s,py+8*s],[px-3*s,py+8*s]],MASK_CODE.reflected_phone,clip);
  }
}

export function declaredReferenceMask(width = 180, height = 240) {
  const labels = new Uint8Array(width * height);
  const sx = width / 180, sy = height / 240;
  const mirror = [30*sx, 26*sy, 86*sx, 128*sy];
  for (let y = Math.floor(mirror[1]); y < Math.min(height, Math.ceil(mirror[1] + mirror[3])); y++) {
    for (let x = Math.floor(mirror[0]); x < Math.min(width, Math.ceil(mirror[0] + mirror[2])); x++) labels[y * width + x] = MASK_CODE.mirror;
  }
  // Exact transforms from §11's v5 REFERENCE diagram, scaled to the requested raster.
  frontFigure(labels,width,height,86*sx,152*sy,0.34*Math.min(sx,sy),true,mirror);
  frontFigure(labels,width,height,112*sx,656*sy,1.78*Math.min(sx,sy),false,null);
  return {
    id: DECLARED_MASK_ID,
    version: DECLARED_MASK_VERSION,
    width,
    height,
    labels,
    provenance: "Mirror_Portrait_UI_Spec_v5.html §11 mask reference SVG",
  };
}
