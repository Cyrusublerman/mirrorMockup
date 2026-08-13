import { applyHomography } from "../../shared_math/homography.js";
import { sampleQ } from "../content_q/content.js";
import { sampleI, evaluateRecursion } from "../recursion/kernel.js";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u32(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function chunk(type, data) {
  const t = [...type].map((ch) => ch.charCodeAt(0));
  const body = new Uint8Array([...t, ...data]);
  const crc = crc32(body);
  return new Uint8Array([...u32(data.length), ...body, ...u32(crc)]);
}

export function encodePng(width, height, rgba) {
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0);
    const row = rgba.slice(y * width * 4, (y + 1) * width * 4);
    raw.push(...row);
  }
  const ihdr = new Uint8Array([
    ...u32(width),
    ...u32(height),
    8,
    6,
    0,
    0,
    0,
  ]);
  const deflated = deflateStore(new Uint8Array(raw));
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  const out = new Uint8Array([
    ...sig,
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", deflated),
    ...chunk("IEND", []),
  ]);
  return out;
}

function deflateStore(data) {
  const blocks = [];
  let i = 0;
  while (i < data.length) {
    const n = Math.min(65535, data.length - i);
    const last = i + n >= data.length ? 1 : 0;
    const len = n;
    const nlen = 0xffff ^ len;
    blocks.push(last, len & 255, (len >> 8) & 255, nlen & 255, (nlen >> 8) & 255, ...data.slice(i, i + n));
    i += n;
  }
  const cmf = 8;
  const flg = 29;
  const adler = adler32(data);
  return new Uint8Array([cmf, flg, ...blocks, ...u32(adler)]);
}

function adler32(data) {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function pointInQuad(p, q) {
  let c = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const yi = q[i][1], yj = q[j][1];
    const xi = q[i][0], xj = q[j][0];
    const inter = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi + 1e-15) + xi;
    if (inter) c = !c;
  }
  return c;
}

function sub2(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function inverseBilinear(p, q) {
  const A = q[0], B = q[1], C = q[2], D = q[3];
  const e = sub2(B, A);
  const f = sub2(D, A);
  const g = [A[0] - B[0] + C[0] - D[0], A[1] - B[1] + C[1] - D[1]];
  const h = sub2(p, A);
  const k2 = g[0] * f[1] - g[1] * f[0];
  const k1 = e[0] * f[1] - e[1] * f[0] + h[0] * g[1] - h[1] * g[0];
  const k0 = h[0] * e[1] - h[1] * e[0];
  let v;
  if (Math.abs(k2) < 1e-12) v = -k0 / (k1 || 1e-15);
  else {
    const disc = Math.max(0, k1 * k1 - 4 * k2 * k0);
    const sd = Math.sqrt(disc);
    const v1 = (-k1 - sd) / (2 * k2);
    const v2 = (-k1 + sd) / (2 * k2);
    v = v1 >= -1e-6 && v1 <= 1 + 1e-6 ? v1 : v2;
  }
  const dx = e[0] + g[0] * v;
  const dy = e[1] + g[1] * v;
  const u = Math.abs(dx) > Math.abs(dy) ? (h[0] - f[0] * v) / (dx || 1e-15) : (h[1] - f[1] * v) / (dy || 1e-15);
  return [u, v];
}

function rectifyP(z, carrier) {
  if (carrier?.inverse) {
    const uv = applyHomography(carrier.inverse, z);
    if (uv) return uv;
  }
  if (carrier?.quad) return inverseBilinear(z, carrier.quad);
  return z;
}

function rgb255(rgb) {
  return [Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255)];
}

export function renderField(effective, requested, width = 256, height = 256) {
  const rgba = new Uint8Array(width * height * 4);
  const rec = effective.recursion || {};
  const mode = rec.mode;
  const cert = rec.certificate;
  const pQuad = effective.carrier_p?.quad;
  const qState = effective.content_q || requested.content_q || {};
  const tau = requested.view?.tau || 0;
  let viewCert = cert;
  if (cert && mode && mode !== "OFF") {
    const b = cert.beta || [0, 0];
    const phase = effective.view?.phase || [Math.max(0, tau - 2) * (effective.view?.loop_period || 0), 0];
    viewCert = { ...cert, beta: [b[0] + phase[0], b[1] + (phase[1] || 0)] };
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = width === 1 ? 0.5 : x / (width - 1);
      const v = height === 1 ? 0.5 : y / (height - 1);
      const z = [u, v];
      const i = (y * width + x) * 4;
      let r, g, b;
      if (viewCert && mode && mode !== "OFF") {
        const s = sampleI(z, viewCert, qState);
        r = s.rgba[0];
        g = s.rgba[1];
        b = s.rgba[2];
      } else {
        r = 28;
        g = 30;
        b = 38;
        if (pQuad && pointInQuad(z, pQuad)) {
          const uv = rectifyP(z, effective.carrier_p);
          const rgb = rgb255(sampleQ(uv, qState));
          r = rgb[0];
          g = rgb[1];
          b = rgb[2];
        }
      }
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return { width, height, rgba };
}

function setPx(rgba, w, h, x, y, rgb) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 4;
  rgba[i] = rgb[0];
  rgba[i + 1] = rgb[1];
  rgba[i + 2] = rgb[2];
  rgba[i + 3] = 255;
}

function drawDot(rgba, w, h, x, y, rgb, rad = 2) {
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    if (dx * dx + dy * dy <= rad * rad) setPx(rgba, w, h, x + dx, y + dy, rgb);
  }
}

function drawLine(rgba, w, h, x0, y0, x1, y1, rgb) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    setPx(rgba, w, h, x0, y0, rgb);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function burnOverlay(rgba, w, h, requested, effective) {
  const q = effective.carrier_p?.quad;
  if (q) {
    const gold = [201, 162, 39];
    for (let i = 0; i < 4; i++) {
      const a = q[i];
      const b = q[(i + 1) % 4];
      drawLine(rgba, w, h, a[0] * (w - 1), a[1] * (h - 1), b[0] * (w - 1), b[1] * (h - 1), gold);
    }
  }
  const feats = requested.reference?.landmarks?.features;
  if (feats) {
    const col = [20, 20, 20];
    for (const f of Object.values(feats)) {
      if (!f.bbox_centre && !f.centroid) continue;
      const pt = f.bbox_centre || f.centroid;
      drawDot(rgba, w, h, pt[0] * (w - 1), pt[1] * (h - 1), col, 2);
    }
  }
}

export function exportImage(requested, effective, opts = {}) {
  const w = opts.width || 512;
  const h = opts.height || 512;
  const product = opts.product || "EXPORT_IMAGE";
  const field = renderField(effective, requested, w, h);
  const png = encodePng(w, h, field.rgba);
  const cert = effective.recursion?.certificate;
  const sidecar = {
    product,
    warp: effective.recursion.mode,
    tau: requested.view.tau,
    segment: effective.view.segment,
    p_valid: effective.carrier_p.valid,
    p_reasons: effective.carrier_p.reasons,
    output_repeat: effective.recursion.output_repeat || cert?.output_repeat || cert?.gamma_abs,
    p_log: cert?.p_log || cert?.pole,
    p_fix: cert?.p_fix,
    loop_state: effective.recursion.loop_state,
    certificate_kind: effective.recursion.certificate_kind,
    solver: effective.solver || null,
    certificate: cert && {
      q: cert.q,
      n: cert.n,
      S: cert.S,
      gamma_abs: cert.gamma_abs,
      gamma_arg: cert.gamma_arg,
      pole: cert.pole,
    },
    width: w,
    height: h,
    private_image_included: false,
  };
  const staging = {
    phone: requested.phone,
    mirror: requested.mirror,
    apparatus: {
      d_M: effective.apparatus?.d_M,
      pan_uv: effective.apparatus?.pan_uv,
      frame_authority: effective.apparatus?.frame_authority,
    },
    body_root: requested.body.pose_targets.root,
    fov: requested.camera.hfov_request,
    crop: requested.camera.crop_request,
    support: effective.support,
    tolerances: effective.solver?.tolerance_set_hash,
  };
  let unwarped = null;
  if (effective.recursion.mode !== "OFF") {
    const offReq = structuredClone(requested);
    offReq.recursion.mode = "OFF";
    const offEff = { ...effective, recursion: { ...effective.recursion, mode: "OFF", certificate: null } };
    unwarped = encodePng(w, h, renderField(offEff, offReq, w, h).rgba);
  }
  const over = field.rgba.slice();
  burnOverlay(over, w, h, requested, effective);
  const overlay = encodePng(w, h, over);
  let recursive_reference = null;
  const autoReq = structuredClone(requested);
  autoReq.recursion.mode = "AUTO";
  autoReq.view.tau = 2;
  const autoRec = evaluateRecursion(autoReq, effective.carrier_p);
  if (!autoRec.refused && autoRec.certificate) {
    const autoEff = { ...effective, recursion: autoRec, view: { ...effective.view, tau: 2, segment: "APPROACH" } };
    recursive_reference = encodePng(w, h, renderField(autoEff, autoReq, w, h).rgba);
  }
  return {
    png,
    final_camera: png,
    unwarped,
    overlay,
    recursive_reference,
    sidecar,
    staging,
    products: {
      EXPORT_FINAL_CAMERA: png,
      EXPORT_STAGING_PRESCRIPTION: staging,
      EXPORT_COMPOSITION_OVERLAY: overlay,
      EXPORT_REFERENCE_RENDER: recursive_reference,
    },
  };
}

export function pngToDataUrl(png) {
  let s = "";
  for (let i = 0; i < png.length; i++) s += String.fromCharCode(png[i]);
  const b64 = btoa(s);
  return `data:image/png;base64,${b64}`;
}
