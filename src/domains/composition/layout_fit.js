import landmarks from "../../../fixtures/P0/landmarks.js";
import { anatomicalQuat } from "../body/skeleton.js";
import { projectWorld } from "../visibility/report.js";
import { clamp } from "../../shared_math/numerical.js";
import { SUBJECT_MAP } from "./targets.js";

export const OPTICAL_LOCK = Object.freeze({
  mount: "FRONT",
  screen_toward: "subject_mirror",
  n_M: "-f",
  P: "reflected_screen",
});

export const W_GAP = 8;
export const W_REL = 0.8;
const FD_H = 1e-3;
const MAX_ITERS = 5;
const IK_MAX = 0.05;

const P0_HEAD = landmarks.features.direct_head.bbox_centre;
const P0_PHONE = landmarks.features.phone.bbox_centre;
export const P0_GAP = Object.freeze([P0_HEAD[0] - P0_PHONE[0], P0_HEAD[1] - P0_PHONE[1]]);

const REL_IDS = ["mirror", "reflected_head", "reflected_wrist_R", "reflected_body"];

const PARAMS = [
  {
    id: "phone_x",
    lo: -0.15,
    hi: 0.4,
    get: (r) => r.phone.transform_request.translation[0],
    set: (r, v) => {
      r.phone.transform_request.translation[0] = v;
    },
  },
  {
    id: "phone_z",
    lo: 1.25,
    hi: 1.72,
    get: (r) => r.phone.transform_request.translation[2],
    set: (r, v) => {
      r.phone.transform_request.translation[2] = v;
    },
  },
  {
    id: "phone_roll",
    lo: 0,
    hi: 0.9,
    get: (r) => r.phone.transform_request.roll,
    set: (r, v) => {
      r.phone.transform_request.roll = v;
    },
  },
  {
    id: "root_x",
    lo: -0.25,
    hi: 0.2,
    get: (r) => r.body.pose_targets.root.translation[0],
    set: (r, v) => {
      r.body.pose_targets.root.translation[0] = v;
    },
  },
  {
    id: "root_y",
    lo: 0.7,
    hi: 1.15,
    get: (r) => r.body.pose_targets.root.translation[1],
    set: (r, v) => {
      r.body.pose_targets.root.translation[1] = v;
    },
  },
  {
    id: "head_bend",
    lo: -0.45,
    hi: 0.45,
    get: (r) => r.body.pose_targets.btt_euler?.head?.bend || 0,
    set: (r, v) => {
      const euler = r.body.pose_targets.btt_euler || (r.body.pose_targets.btt_euler = {});
      const head = euler.head || (euler.head = { bend: 0, tilt: 0, twist: 0 });
      head.bend = v;
      r.body.pose_targets.bend_tilt_twist.head = anatomicalQuat(v, head.tilt || 0, head.twist || 0);
    },
  },
];

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function hypot2(r) {
  let s = 0;
  for (let i = 0; i < r.length; i++) s += r[i] * r[i];
  return s;
}

function centroid(quad) {
  if (!quad || quad.length < 4) return null;
  let x = 0;
  let y = 0;
  for (let i = 0; i < 4; i++) {
    const p = quad[i];
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
    x += p[0];
    y += p[1];
  }
  return [x / 4, y / 4];
}

function mirrorCentroidCapture(parts) {
  const q = parts.mirror?.quad;
  if (!q || !parts.cam) return null;
  return centroid(q.map((X) => projectWorld(X, parts.cam).image_norm_capture));
}

export function captureLandmark(id, parts) {
  const spec = SUBJECT_MAP[id];
  if (!spec) return null;
  if (spec.space === "unmeasured") return null;
  if (spec.space === "carrier_p") return centroid(parts.carrier_p?.quad_capture);
  if (spec.space === "mirror_quad") return mirrorCentroidCapture(parts);
  const report = parts.visibility?.reports?.[spec.fk];
  if (!report) return null;
  if (spec.space === "direct") {
    const p = report.direct?.image_norm_capture;
    return report.direct?.valid && p ? p : null;
  }
  if (spec.space === "reflected") {
    const p = report.reflected?.projection?.image_norm_capture;
    return report.reflected?.projection?.valid && p ? p : null;
  }
  return null;
}

export function opticalLockHolds(parts) {
  const cam = parts?.cam;
  const phone = parts?.phone;
  const mirror = parts?.mirror;
  if (!cam || !phone || !mirror) return false;
  if (cam.mount !== "FRONT" || phone.mount !== "FRONT") return false;
  if (cam.same_side_as_screen !== true) return false;
  const f = cam.basis?.forward;
  const n = mirror.basis?.n;
  const sn = phone.screen_normal;
  if (!f || !n || !sn) return false;
  if (Math.abs(dot(sn, f) - 1) > 1e-4) return false;
  if (Math.abs(dot(n, f) + 1) > 1e-4) return false;
  if (!parts.carrier_p?.valid) return false;
  const head = parts.pose?.fk?.head;
  const screen = phone.screen_corners_world?.[0];
  const M = mirror.centre;
  const C = cam.world?.translation;
  if (!head || !screen || !M || !C) return false;
  const along = (X) => (X[0] - C[0]) * f[0] + (X[1] - C[1]) * f[1] + (X[2] - C[2]) * f[2];
  if (!(along(screen) < along(head) && along(head) < along(M))) return false;
  const ik = (parts.pose?.constraints || []).reduce((m, c) => Math.max(m, c.residual || 0), 0);
  if (ik > IK_MAX) return false;
  return true;
}

export function layoutResiduals(parts) {
  const head = captureLandmark("direct_head", parts);
  const phone = captureLandmark("phone", parts);
  const r = [];
  let gap = null;
  if (head && phone) {
    gap = [head[0] - phone[0], head[1] - phone[1]];
    r.push(W_GAP * (gap[0] - P0_GAP[0]));
    r.push(W_GAP * (gap[1] - P0_GAP[1]));
  }
  if (phone) {
    for (const id of REL_IDS) {
      const p = captureLandmark(id, parts);
      const p0 = landmarks.features[id]?.bbox_centre;
      if (!p || !p0) continue;
      r.push(W_REL * (p[0] - phone[0] - (p0[0] - P0_PHONE[0])));
      r.push(W_REL * (p[1] - phone[1] - (p0[1] - P0_PHONE[1])));
    }
  }
  return { r, gap, head, phone };
}

export function shouldLayoutFit(req) {
  const mode = req.composition?.solve_mode;
  if (mode !== "P0_RECONSTRUCT" && mode !== "COMPOSITION_FIT") return false;
  const freedoms = req.composition?.solve_freedoms || [];
  if (!(freedoms.includes("x_decision") || (freedoms.includes("phone") && freedoms.includes("pose")))) return false;
  const le = req.workspace?.last_edit;
  if (le == null) return true;
  if (le.action === "LOAD_P0_PROFILE") return true;
  if (le.action !== "SET_DRIVER") return false;
  const d = String(le.driver || "");
  return d === "COMPOSITION_FIT" || d === "P0_RECONSTRUCT" || d === "composition_targets" || d === "P0_fixture";
}

function readX(req) {
  return PARAMS.map((p) => p.get(req));
}

function applyX(req, x) {
  for (let i = 0; i < PARAMS.length; i++) PARAMS[i].set(req, clamp(x[i], PARAMS[i].lo, PARAMS[i].hi));
}

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => row.concat([b[i]]));
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
    if (Math.abs(M[piv][k]) < 1e-14) return null;
    if (piv !== k) {
      const tmp = M[k];
      M[k] = M[piv];
      M[piv] = tmp;
    }
    const akk = M[k][k];
    for (let j = k; j <= n; j++) M[k][j] /= akk;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = M[i][k];
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  return M.map((row) => row[n]);
}

function evalAt(req, x, evaluate) {
  applyX(req, x);
  const parts = evaluate(req);
  const lock = opticalLockHolds(parts);
  const { r, gap } = layoutResiduals(parts);
  return { parts, r, gap, valid: lock && r.length > 0 };
}

export function fitLayout(req, evaluate) {
  let x = readX(req);
  applyX(req, x);
  x = readX(req);
  let cur = evalAt(req, x, evaluate);
  const cost0 = hypot2(cur.r);
  let cost = cost0;
  let lambda = 0.05;
  let iterations = 0;
  if (!cur.valid) {
    return { parts: cur.parts, iterations: 0, cost0, cost, accepted: false, gap: cur.gap };
  }
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    iterations = iter + 1;
    const n = x.length;
    const m = cur.r.length;
    const J = Array.from({ length: m }, () => Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      const xp = x.slice();
      xp[j] += FD_H;
      const trial = evalAt(req, xp, evaluate);
      if (!trial.valid || trial.r.length !== m) continue;
      const invh = 1 / FD_H;
      for (let i = 0; i < m; i++) J[i][j] = (trial.r[i] - cur.r[i]) * invh;
    }
    applyX(req, x);
    const JtJ = Array.from({ length: n }, () => Array(n).fill(0));
    const Jtr = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        let s = 0;
        for (let i = 0; i < m; i++) s += J[i][j] * J[i][k];
        JtJ[j][k] = s;
      }
      let t = 0;
      for (let i = 0; i < m; i++) t += J[i][j] * cur.r[i];
      Jtr[j] = t;
    }
    for (let j = 0; j < n; j++) JtJ[j][j] += lambda;
    const dx = solveLinear(JtJ, Jtr.map((v) => -v));
    if (!dx) {
      lambda *= 8;
      continue;
    }
    const xTry = x.map((v, i) => v + dx[i]);
    const trial = evalAt(req, xTry, evaluate);
    const cTry = hypot2(trial.r);
    if (trial.valid && cTry < cost) {
      x = readX(req);
      cur = trial;
      cost = cTry;
      lambda = Math.max(1e-6, lambda * 0.3);
      if (cost < 1e-6) break;
    } else {
      applyX(req, x);
      cur = evalAt(req, x, evaluate);
      lambda *= 8;
    }
  }
  applyX(req, x);
  return { parts: cur.parts, iterations, cost0, cost, accepted: cost < cost0, gap: cur.gap };
}
