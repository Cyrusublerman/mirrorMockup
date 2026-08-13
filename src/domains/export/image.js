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

export function renderField(effective, requested, width = 256, height = 256) {
  const rgba = new Uint8Array(width * height * 4);
  const cert = effective.recursion.certificate;
  const mode = effective.recursion.mode;
  const pQuad = effective.carrier_p.quad;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      const i = (y * width + x) * 4;
      let r = Math.floor(40 + 80 * u);
      let g = Math.floor(40 + 80 * v);
      let b = 70;
      if (pQuad) {
        const inside = pointInQuad([u, v], pQuad);
        if (inside) {
          r = 220;
          g = 180;
          b = 60;
        }
      }
      if (mode && mode !== "OFF" && cert) {
        const z = [u - (cert.pole?.[0] || 0.5), v - (cert.pole?.[1] || 0.5)];
        const ang = Math.atan2(z[1], z[0]);
        const rad = Math.log(Math.hypot(z[0], z[1]) + 1e-6) + (requested.view.tau || 0);
        r = Math.floor(128 + 120 * Math.cos(ang * cert.n + rad));
        g = Math.floor(128 + 120 * Math.sin(ang * cert.n + rad * 0.7));
        b = Math.floor(90 + 80 * Math.cos(rad));
      }
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return { width, height, rgba };
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

export function exportImage(requested, effective, opts = {}) {
  const w = opts.width || 512;
  const h = opts.height || 512;
  const field = renderField(effective, requested, w, h);
  const png = encodePng(w, h, field.rgba);
  const sidecar = {
    warp: effective.recursion.mode,
    tau: requested.view.tau,
    segment: effective.view.segment,
    p_valid: effective.carrier_p.valid,
    p_reasons: effective.carrier_p.reasons,
    certificate: effective.recursion.certificate && {
      q: effective.recursion.certificate.q,
      n: effective.recursion.certificate.n,
      S: effective.recursion.certificate.S,
      gamma_abs: effective.recursion.certificate.gamma_abs,
      gamma_arg: effective.recursion.certificate.gamma_arg,
    },
    width: w,
    height: h,
  };
  let unwarped = null;
  if (effective.recursion.mode !== "OFF") {
    const offReq = structuredClone(requested);
    offReq.recursion.mode = "OFF";
    unwarped = encodePng(w, h, renderField({ ...effective, recursion: { ...effective.recursion, mode: "OFF", certificate: null } }, offReq, w, h).rgba);
  }
  return { png, sidecar, unwarped };
}

export function pngToDataUrl(png) {
  let s = "";
  for (let i = 0; i < png.length; i++) s += String.fromCharCode(png[i]);
  const b64 = btoa(s);
  return `data:image/png;base64,${b64}`;
}
