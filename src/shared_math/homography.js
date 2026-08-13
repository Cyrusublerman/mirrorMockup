function solve3(A, b) {
  const m = A.map((row) => row.slice());
  const x = b.slice();
  const n = 3;
  const idx = [0, 1, 2];
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(m[r][i]) > Math.abs(m[piv][i])) piv = r;
    if (Math.abs(m[piv][i]) < 1e-14) return null;
    if (piv !== i) {
      [m[i], m[piv]] = [m[piv], m[i]];
      [x[i], x[piv]] = [x[piv], x[i]];
    }
    const diag = m[i][i];
    for (let c = i; c < n; c++) m[i][c] /= diag;
    x[i] /= diag;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = m[r][i];
      for (let c = i; c < n; c++) m[r][c] -= f * m[i][c];
      x[r] -= f * x[i];
    }
  }
  return x;
}

export function homographyFromPoints(src, dst) {
  if (src.length < 4 || dst.length < 4) throw new Error("need 4 point pairs");
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve8(A, b);
  if (!h) return null;
  h.push(1);
  return h;
}

function solve8(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    if (Math.abs(M[piv][i]) < 1e-14) return null;
    [M[i], M[piv]] = [M[piv], M[i]];
    const diag = M[i][i];
    for (let c = i; c <= n; c++) M[i][c] /= diag;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map((row) => row[n]);
}

export function applyHomography(H, p) {
  const x = H[0] * p[0] + H[1] * p[1] + H[2];
  const y = H[3] * p[0] + H[4] * p[1] + H[5];
  const w = H[6] * p[0] + H[7] * p[1] + H[8];
  if (Math.abs(w) < 1e-14) return null;
  return [x / w, y / w];
}

export function invertHomography(H) {
  const m = [
    [H[0], H[1], H[2]],
    [H[3], H[4], H[5]],
    [H[6], H[7], H[8]],
  ];
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  if (Math.abs(det) < 1e-14) return { H: null, condition: Infinity, det };
  const invDet = 1 / det;
  const adj = [
    (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet,
    (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet,
    (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet,
    (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet,
    (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet,
    (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet,
    (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet,
    (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet,
    (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet,
  ];
  const fro = Math.hypot(...H);
  const froi = Math.hypot(...adj);
  return { H: adj, condition: fro * froi, det };
}

export { solve3 };
