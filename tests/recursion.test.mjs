import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { defaultRequestedState } from "../src/scene/requested_state.js";
import * as cplx from "../src/shared_math/complex.js";
import {
  autoAvailable,
  evaluateRecursion,
  sampleI,
  sampleSource,
  inverseW,
  W,
  certifyKernel,
} from "../src/domains/recursion/kernel.js";
import { sampleQ, evaluateQ } from "../src/domains/content_q/content.js";
import { exportImage } from "../src/domains/export/image.js";
import { gpuSampleUv } from "../src/domains/recursion/kernel.js";

function circ(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
}

function uvDist(a, b) {
  return Math.hypot(circ(a[0], b[0]), circ(a[1], b[1]));
}

function fakeP(valid = true) {
  return {
    valid,
    reasons: valid ? [] : ["P_INVALID"],
    quad: [
      [0.2, 0.2],
      [0.8, 0.22],
      [0.78, 0.8],
      [0.22, 0.78],
    ],
  };
}

function autoReq(extra = {}) {
  const r = defaultRequestedState();
  r.recursion.mode = "AUTO";
  Object.assign(r.recursion, extra);
  return r;
}

test("AUTO available iff P valid", () => {
  assert.equal(autoAvailable(null), false);
  assert.equal(autoAvailable({ valid: true }), true);
  assert.equal(autoAvailable({ valid: false }), false);
  const refused = evaluateRecursion(autoReq(), fakeP(false));
  assert.equal(refused.refused, true);
  assert.equal(refused.mode, "OFF");
  assert.equal(refused.certificate, null);
  const ok = evaluateRecursion(autoReq(), fakeP(true));
  assert.equal(ok.refused, false);
  assert.equal(ok.mode, "AUTO");
  assert.ok(ok.certificate.alpha);
  assert.ok(ok.certificate.lattice);
  assert.ok(ok.certificate.gamma_abs);
  assert.ok("gamma_arg" in ok.certificate);
  assert.ok(ok.certificate.pole);
  assert.ok(ok.certificate.beta);
  assert.equal(typeof ok.certificate.map, "function");
  assert.equal(ok.certificate.q, 1);
  assert.equal(ok.certificate.n, 1);
  assert.equal(ok.certificate.S, 256);
  const app = createApp();
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const p = app.getEffective().carrier_p;
  const rec = app.getEffective().recursion;
  assert.equal(rec.available, p.valid);
  if (p.valid) {
    assert.equal(rec.refused, false);
    assert.equal(rec.mode, "AUTO");
  } else {
    assert.equal(rec.refused, true);
  }
  app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false });
  app.dispatch("SET_MIRROR_APERTURE", { width_m: 1e-4, height_m: 1e-4 });
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  assert.equal(autoAvailable(app.getEffective().carrier_p), app.getEffective().carrier_p.valid);
  if (!app.getEffective().carrier_p.valid) {
    assert.equal(app.getEffective().recursion.available, false);
    assert.equal(app.getEffective().recursion.refused, true);
  }
});

test("moving Q does not change P", () => {
  const app = createApp();
  const p0 = app.getEffective().carrier_p.quad;
  const q0 = evaluateQ(app.getRequested(), app.getEffective().carrier_p);
  app.dispatch("SET_CONTENT_Q", { scale: 0.4, offset: [0.1, 0.1], rotation: 0.3 });
  const p1 = app.getEffective().carrier_p.quad;
  for (let i = 0; i < 4; i++) {
    assert.ok(Math.hypot(p1[i][0] - p0[i][0], p1[i][1] - p0[i][1]) < 1e-12);
  }
  const q1 = app.getEffective().content_q;
  assert.equal(q1.carrier_unchanged, true);
  const a = sampleQ([0.3, 0.4], q0);
  const b = sampleQ([0.3, 0.4], q1);
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 1e-4);
});

test("warp toggle does not move phone geometry", () => {
  const app = createApp();
  const phone0 = structuredClone(app.getRequested().phone);
  const world0 = JSON.stringify(app.getEffective().phone.world);
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  assert.deepEqual(app.getRequested().phone, phone0);
  assert.equal(JSON.stringify(app.getEffective().phone.world), world0);
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "ADVANCED" });
  assert.deepEqual(app.getRequested().phone, phone0);
  assert.equal(JSON.stringify(app.getEffective().phone.world), world0);
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "OFF" });
  assert.deepEqual(app.getRequested().phone, phone0);
  assert.equal(JSON.stringify(app.getEffective().phone.world), world0);
});

test("sampleI period and sampleSource lattice", () => {
  const rec = evaluateRecursion(autoReq(), fakeP(true));
  const cert = rec.certificate;
  const qState = { fill_mode: "cover", scale: 1, offset: [0, 0], rotation: 0, crop: { x: 0, y: 0, w: 1, h: 1 } };
  const p = cert.pole;
  const z = [p[0] + 0.12, p[1] - 0.07];
  const a = sampleI(z, cert, qState);
  const z2 = cplx.add(p, cplx.mul(cert.gamma, cplx.sub(z, p)));
  const b = sampleI(z2, cert, qState);
  assert.equal(a.folded, false);
  assert.ok(uvDist(a.uv, b.uv) < 1e-6);
  assert.ok(Math.abs(a.rgba[0] - b.rgba[0]) <= 2);
  assert.ok(Math.abs(a.rgba[1] - b.rgba[1]) <= 2);
  assert.ok(Math.abs(a.rgba[2] - b.rgba[2]) <= 2);
  const Wz = W(z, p, cert.alpha, cert.beta);
  const uv1 = sampleSource(Wz, cert.lattice);
  const uv2 = sampleSource(cplx.add(Wz, cert.lattice.lambda1), cert.lattice);
  assert.ok(uvDist(uv1, uv2) < 1e-6);
  const near = sampleI(p, cert, qState);
  assert.equal(near.uv, null);
  assert.equal(near.folded, false);
});

test("PNG ON and OFF at same view", () => {
  const app = createApp();
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const req = app.getRequested();
  const eff = app.getEffective();
  const on = exportImage(req, eff, { width: 48, height: 48 });
  assert.equal(on.png[0], 137);
  assert.equal(on.png[1], 80);
  assert.ok(on.overlay);
  assert.equal(on.overlay[0], 137);
  assert.ok(on.sidecar);
  assert.ok("pole" in (on.sidecar.certificate || { pole: true }) || on.sidecar.certificate == null);
  assert.equal(on.staging.fov, req.camera.hfov_request);
  assert.equal(on.staging.phone, req.phone);
  if (eff.carrier_p.valid) {
    assert.ok(on.unwarped);
    assert.equal(on.unwarped[0], 137);
    assert.equal(on.unwarped[1], 80);
    assert.notDeepEqual([...on.png.slice(0, 200)], [...on.unwarped.slice(0, 200)]);
    let differ = false;
    const n = Math.min(on.png.length, on.unwarped.length);
    for (let i = 0; i < n; i++) if (on.png[i] !== on.unwarped[i]) {
      differ = true;
      break;
    }
    assert.equal(differ, true);
    assert.ok(on.recursive_reference);
    assert.equal(on.recursive_reference[0], 137);
    assert.ok(on.sidecar.certificate.pole);
  }
  const offReq = structuredClone(req);
  offReq.recursion.mode = "OFF";
  const offEff = { ...eff, recursion: { ...eff.recursion, mode: "OFF", certificate: null } };
  const off = exportImage(offReq, offEff, { width: 48, height: 48 });
  assert.equal(off.png[0], 137);
  assert.equal(off.png[1], 80);
  assert.equal(off.unwarped, null);
});

test("gpuSampleUv matches CPU", () => {
  const rec = evaluateRecursion(autoReq(), fakeP(true));
  const cert = rec.certificate;
  const z = [0.61, 0.37];
  const uvG = gpuSampleUv(z, cert);
  const uvC = sampleSource(W(z, cert.pole, cert.alpha, cert.beta), cert.lattice);
  assert.ok(Math.hypot(uvG[0] - uvC[0], uvG[1] - uvC[1]) < 1e-9);
});

test("inverseW(W(z)) recovers z away from pole", () => {
  const c = certifyKernel({ q: 1, n: 1, Sval: 256, theta_s: 0 });
  const p = [0.5, 0.5];
  const beta = [0.1, -0.2];
  const z = [0.72, 0.41];
  const w = W(z, p, c.alpha, beta);
  const z2 = inverseW(w, p, c.alpha, beta);
  assert.ok(Math.hypot(z2[0] - z[0], z2[1] - z[1]) < 1e-9);
});
