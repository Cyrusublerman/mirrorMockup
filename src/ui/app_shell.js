import { createApp } from "../app/facade.js";
import { createScene3D } from "../render/scene_3d.js";
import { injectShellCss } from "./shell.js";
import { createWorkspaceState } from "./state/workspace_state.js";
import { createInteractionMachine } from "./state/interaction_state_machine.js";
import { createDispatchAdapter } from "./adapters/action_dispatch_adapter.js";
import { projectForHud } from "./adapters/selector_projection_adapter.js";
import { mountTopModeStrip } from "./hud/top_mode_strip.js";
import { mountContextHud } from "./hud/context_hud.js";
import { mountValidityStrip } from "./hud/validity_strip.js";
import { mountCertificateBadge } from "./hud/certificate_badge.js";
import { mountInspectDrawer } from "./hud/inspect_drawer.js";
import { mountPrecisionSheet } from "./hud/precision_sheet.js";
import { mountViewStrip } from "./hud/view_strip.js";
import { mountOverlayStrip } from "./hud/overlay_strip.js";
import { drawOverlays } from "./overlays/composition_overlay_stack.js";
import { createReferenceLayer } from "./overlays/reference_layer.js";
import { bindInsetSwap, insetPinchHfov } from "./viewport/artwork_camera_inset.js";
import { createEditorViewport } from "./viewport/editor_viewport.js";
import { hitFromEvent } from "./viewport/scene_hit_test.js";
import { labelForHit } from "./viewport/manipulator_layer.js";
import { poseChrome } from "./rooms/pose_room.js";
import { sceneChrome } from "./rooms/scene_room.js";
import { recursionChrome } from "./rooms/recursion_room.js";
import { applySemanticJoint } from "./manipulators/semantic_joint.js";
import { applyEndpointIk } from "./manipulators/endpoint_ik.js";
import { applyRigidPhone } from "./manipulators/rigid_phone.js";
import { applyMirrorDistance, applyMirrorWindow } from "./manipulators/mirror_aperture.js";
import { applyCropPan } from "./manipulators/crop.js";
import { applyQOffset } from "./manipulators/q_portal.js";

const IK_JOINTS = new Set(["wrist_R", "wrist_L", "head", "ankle_L", "ankle_R"]);

function bytesToPngUrl(png) {
  let s = "";
  for (let i = 0; i < png.length; i++) s += String.fromCharCode(png[i]);
  return `data:image/png;base64,${btoa(s)}`;
}

function layout() {
  const root = document.createElement("div");
  root.className = "mp-app";
  root.innerHTML = `
    <div class="mp-strip" data-strip></div>
    <div class="mp-stage">
      <canvas id="scene"></canvas>
      <canvas id="overlay"></canvas>
      <div class="mp-inset" data-inset>
        <canvas id="inset"></canvas>
      </div>
    </div>
    <div class="mp-hud">
      <div data-views></div>
      <div data-overlays></div>
      <div data-context></div>
      <div class="mp-hint" data-hint></div>
      <div class="mp-ghost" data-ghost></div>
      <div class="mp-muted mp-res" data-res></div>
      <div class="mp-foot">
        <div data-valid></div>
        <div data-cert></div>
      </div>
    </div>
    <div class="mp-inspect" data-inspect></div>
    <div class="mp-sheet" data-sheet></div>
  `;
  return root;
}

export async function boot(root) {
  injectShellCss(root.ownerDocument);
  const app = createApp();
  const workspace = createWorkspaceState();
  const machine = createInteractionMachine();
  const dispatch = createDispatchAdapter(app);
  const reference = createReferenceLayer();
  workspace.warp = app.getRequested().recursion.mode;
  workspace.q = app.getRequested().recursion.q;
  workspace.n = app.getRequested().recursion.n;
  workspace.drive_mode = app.getRequested().phone.authority;

  root.replaceChildren();
  const shell = layout();
  root.appendChild(shell);

  const canvas = shell.querySelector("#scene");
  const overlay = shell.querySelector("#overlay");
  const insetCanvas = shell.querySelector("#inset");
  const insetWrap = shell.querySelector("[data-inset]");
  const strip = shell.querySelector("[data-strip]");
  const viewsEl = shell.querySelector("[data-views]");
  const overlaysEl = shell.querySelector("[data-overlays]");
  const contextEl = shell.querySelector("[data-context]");
  const hintEl = shell.querySelector("[data-hint]");
  const ghostEl = shell.querySelector("[data-ghost]");
  const resEl = shell.querySelector("[data-res]");
  const validEl = shell.querySelector("[data-valid]");
  const certEl = shell.querySelector("[data-cert]");
  const inspectEl = shell.querySelector("[data-inspect]");
  const sheetEl = shell.querySelector("[data-sheet]");
  const stage = shell.querySelector(".mp-stage");

  const inspectBtn = document.createElement("button");
  inspectBtn.type = "button";
  inspectBtn.className = "mp-icon";
  inspectBtn.textContent = "INSPECT";
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "mp-chip";
  exportBtn.textContent = "EXPORT";
  const refBtn = document.createElement("button");
  refBtn.type = "button";
  refBtn.className = "mp-chip";
  refBtn.textContent = "REFERENCE";
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.hidden = true;
  const precBtn = document.createElement("button");
  precBtn.type = "button";
  precBtn.className = "mp-chip";
  precBtn.textContent = "PRECISION";

  const scene3d = await createScene3D(canvas, app, { insetCanvas });
  scene3d.setEditorView(workspace.editor_view);

  let euler = { bend: 0, tilt: 0, twist: 0 };
  let drag = null;

  function sizeOverlay() {
    const w = Math.max(1, canvas.clientWidth || stage.clientWidth || 1);
    const h = Math.max(1, canvas.clientHeight || stage.clientHeight || 1);
    if (overlay.width !== w) overlay.width = w;
    if (overlay.height !== h) overlay.height = h;
    return [w, h];
  }

  function paintHud() {
    const proj = projectForHud(app);
    mountTopModeStrip(strip, workspace, (room) => {
      workspace.room = room;
      app.dispatch("SET_WORKSPACE_MODE", { mode: room }, { preview: true });
      paintHud();
    });
    strip.append(inspectBtn, exportBtn, refBtn, precBtn, file);
    mountViewStrip(viewsEl, workspace, (id) => {
      workspace.editor_view = id;
      scene3d.setEditorView(id);
      scene3d.sync();
      paintHud();
    });
    mountOverlayStrip(overlaysEl, workspace, (id) => {
      workspace.overlays[id] = !workspace.overlays[id];
      paintHud();
      paintScene();
    });
    mountContextHud(contextEl, workspace, proj, {
      setDrive(mode) {
        workspace.drive_mode = mode;
        const authority = mode === "HAND_DRIVES_PHONE" ? "HAND_DRIVES_PHONE" : "PHONE_DRIVES_HAND";
        app.dispatch("SET_PHONE_AUTHORITY", { authority }, { label: mode });
        paintHud();
        paintScene();
      },
      setWarp(mode) {
        const pOk = !!proj.portal?.valid;
        if (mode === "AUTO" && !pOk) {
          workspace.warp = app.getEffective().recursion.mode;
          paintHud();
          return;
        }
        workspace.warp = mode;
        app.dispatch("SET_PRINT_GALLERY_MODE", { mode }, { label: `Warp ${mode}` });
        paintHud();
        paintScene();
      },
      nudgeQ() {
        workspace.q = workspace.q === 1 ? -1 : 1;
        app.dispatch("SET_RECURSION_PARAMETER", { q: workspace.q }, { label: "Set q" });
        paintHud();
        paintScene();
      },
      nudgeN() {
        workspace.n = (workspace.n + 1) % 4;
        app.dispatch("SET_RECURSION_PARAMETER", { n: workspace.n }, { label: "Set n" });
        paintHud();
        paintScene();
      },
      select(sel) {
        workspace.selected = sel;
        app.dispatch("SET_SELECTION", { selection: sel.id || sel.kind }, { preview: true });
        paintHud();
      },
      setAxis(axis) {
        workspace.axis = axis;
        if (workspace.selected) workspace.selected.axis = axis;
        paintHud();
      },
    });
    const chrome =
      workspace.room === "SCENE" ? sceneChrome() : workspace.room === "RECURSION" ? recursionChrome(proj) : poseChrome(workspace);
    hintEl.textContent = chrome.hint;
    const r = proj.residuals || {};
    const bits = Object.keys(r).slice(0, 4).map((k) => `${k} ${Number(r[k]).toFixed(3)}`);
    resEl.textContent = bits.join("  ·  ") || "no residual";
    const want = proj.requested?.body?.pose_targets?.endpoint_targets?.wrist_R;
    const got = proj.pose?.fk?.wrist_R;
    if (want && got && Math.hypot(want[0] - got[0], want[1] - got[1], want[2] - got[2]) > 0.03) {
      const arm = (proj.pose.constraints || []).find((c) => c.id === "arm_R_reach");
      ghostEl.textContent = `ghost: requested wrist  residual ${Number(arm?.residual ?? r.arm_R_reach ?? 0).toFixed(3)}`;
    } else ghostEl.textContent = "";
    mountValidityStrip(validEl, proj);
    mountCertificateBadge(certEl, proj);
    mountInspectDrawer(inspectEl, workspace.inspect, proj, () => {
      workspace.inspect = false;
      paintHud();
    });
    const fields = precisionFields();
    mountPrecisionSheet(sheetEl, workspace.precision, fields, (out) => {
      applyPrecision(out);
      workspace.precision = false;
      paintHud();
      paintScene();
    }, () => {
      workspace.precision = false;
      paintHud();
    });
  }

  function precisionFields() {
    const req = app.getRequested();
    const sel = workspace.selected;
    if (sel?.kind === "joint") {
      const e = req.body.pose_targets.btt_euler?.[sel.id] || { bend: 0, tilt: 0, twist: 0 };
      return [
        { key: "bend", label: "Bend", value: e.bend },
        { key: "tilt", label: "Tilt", value: e.tilt },
        { key: "twist", label: "Rotate", value: e.twist },
      ];
    }
    if (sel?.kind === "phone") {
      const t = req.phone.transform_request.translation;
      return [
        { key: "x", label: "X", value: t[0] },
        { key: "y", label: "Y", value: t[1] },
        { key: "z", label: "Z", value: t[2] },
      ];
    }
    if (sel?.id === "d_M") {
      return [{ key: "d_M", label: "d_M (m)", value: req.apparatus.mirror_distance_request_m }];
    }
    if (sel?.kind === "crop") {
      const p = req.camera.crop_request.pan;
      return [
        { key: "u", label: "Crop U", value: p[0] },
        { key: "v", label: "Crop V", value: p[1] },
      ];
    }
    return [{ key: "hfov_deg", label: "HFOV °", value: (req.camera.hfov_request * 180) / Math.PI }];
  }

  function applyPrecision(out) {
    const sel = workspace.selected;
    if (sel?.kind === "joint") {
      app.dispatch("SET_ANATOMICAL_DOF", { joint: sel.id, bend: out.bend || 0, tilt: out.tilt || 0, twist: out.twist || 0 }, { label: `Precision ${sel.id}` });
      return;
    }
    if (sel?.kind === "phone") {
      app.dispatch("MOVE_PHONE", { translation: [out.x, out.y, out.z] }, { label: "Precision phone" });
      return;
    }
    if (sel?.id === "d_M") {
      app.dispatch("SET_MIRROR_DISTANCE", { d_M: out.d_M }, { label: "Precision d_M" });
      return;
    }
    if (sel?.kind === "crop") {
      app.dispatch("PAN_OUTER_FRAME", { pan: [out.u, out.v] }, { label: "Precision crop" });
      return;
    }
    if (out.hfov_deg != null) {
      app.dispatch("SET_CAMERA_FOV", { hfov: (out.hfov_deg * Math.PI) / 180 }, { label: "Precision HFOV" });
    }
  }

  function paintScene() {
    scene3d.resize();
    scene3d.sync();
    const [w, h] = sizeOverlay();
    const ctx = overlay.getContext("2d");
    const proj = projectForHud(app);
    reference.draw(ctx, w, h);
    drawOverlays(ctx, w, h, workspace, proj);
  }

  inspectBtn.addEventListener("click", () => {
    workspace.inspect = !workspace.inspect;
    paintHud();
  });
  exportBtn.addEventListener("click", () => {
    const last = app.dispatch("EXPORT_IMAGE", { width: 640, height: 640 });
    const a = document.createElement("a");
    a.href = bytesToPngUrl(last.export.png);
    a.download = "artwork.png";
    a.click();
    const blob = new Blob([JSON.stringify({ ...last.export.sidecar, staging: last.export.staging }, null, 2)], { type: "application/json" });
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(blob);
    a2.download = "composition.json";
    a2.click();
  });
  refBtn.addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    await reference.loadFile(f);
    paintScene();
  });
  precBtn.addEventListener("click", () => {
    workspace.precision = !workspace.precision;
    paintHud();
  });

  bindInsetSwap(canvas, insetWrap, () => {
    scene3d.swapInset();
    workspace.editor_view = scene3d.workspace.editor_view;
    paintHud();
    paintScene();
  });
  insetPinchHfov(
    insetWrap,
    () => app.getRequested().camera.hfov_request,
    (hfov) => {
      dispatch.startGesture("Set HFOV");
      dispatch.preview("SET_CAMERA_FOV", { hfov });
      paintScene();
    },
  );

  createEditorViewport(canvas, scene3d, machine, {
    onDown(ev, p) {
      const hit = hitFromEvent(scene3d, ev);
      if (hit) {
        workspace.selected = { kind: hit.kind, id: hit.id, label: labelForHit(hit), axis: workspace.axis };
        app.dispatch("SET_SELECTION", { selection: hit.id || hit.kind }, { preview: true });
        const req = app.getRequested();
        if (hit.kind === "joint" && IK_JOINTS.has(hit.id) && workspace.room !== "SCENE") {
          const world = (req.body.pose_targets.endpoint_targets[hit.id] || app.getEffective().skeleton.fk[hit.id] || hit.point).slice();
          drag = { kind: "ik", end: hit.id, world, started: false };
        } else if (hit.kind === "joint") {
          euler = { ...(req.body.pose_targets.btt_euler?.[hit.id] || { bend: 0, tilt: 0, twist: 0 }) };
          drag = { kind: "joint", joint: hit.id, started: false };
        } else if (hit.kind === "phone") {
          drag = { kind: "phone", translation: req.phone.transform_request.translation.slice(), started: false };
        } else if (hit.kind === "mirror") {
          const id = workspace.selected?.id === "window" ? "window" : "d_M";
          workspace.selected = { kind: "mirror", id, label: id === "window" ? "Mirror window" : "Mirror distance" };
          drag = {
            kind: id,
            d_M: req.apparatus.mirror_distance_request_m,
            uv: req.apparatus.mirror_pan_uv_request_m.slice(),
            started: false,
          };
        } else {
          drag = { kind: "orbit", started: false };
        }
        machine.beginSelect(p.id, p);
        paintHud();
        return;
      }
      if (workspace.room === "RECURSION" && workspace.selected?.kind === "q") {
        const off = app.getRequested().content_q.offset.slice();
        drag = { kind: "q", offset: off, started: false };
        machine.beginSelect(p.id, p);
        return;
      }
      if (workspace.selected?.kind === "crop") {
        drag = { kind: "crop", pan: app.getRequested().camera.crop_request.pan.slice(), started: false };
        machine.beginSelect(p.id, p);
        return;
      }
      if (scene3d.workspace.editor_view !== "CAMERA") {
        drag = { kind: "orbit", started: false };
        machine.beginOrbit(p.id, p);
      } else {
        drag = null;
        machine.clear();
      }
    },
    onMove(ev, p) {
      const step = machine.move(p.id, p);
      if (!step || !drag) return;
      const dist = Math.hypot(p.x - (machine.gesture ? p.x : 0), step.dx) + Math.abs(step.dy);
      if (!drag.started && Math.hypot(step.dx, step.dy) < 2 && dist < 2) return;
      if (!drag.started) {
        const labels = {
          ik: `Move ${drag.end}`,
          joint: `Rotate ${drag.joint}`,
          phone: "Move phone",
          d_M: "Set d_M",
          window: "Pan mirror window",
          crop: "Pan crop",
          q: "Move Q",
          orbit: "Orbit editor",
        };
        if (drag.kind !== "orbit") dispatch.startGesture(labels[drag.kind] || "Edit");
        drag.started = true;
      }
      if (drag.kind === "orbit") {
        scene3d.orbit(step.dx, step.dy);
        paintScene();
        return;
      }
      const worldD = scene3d.dragDeltaWorld(step.dx, step.dy);
      if (drag.kind === "ik") {
        drag.world = [drag.world[0] + worldD[0], drag.world[1] + worldD[1], drag.world[2] + worldD[2]];
        applyEndpointIk(dispatch, drag.end, drag.world, true);
      } else if (drag.kind === "joint") {
        euler = applySemanticJoint(dispatch, drag.joint, euler, workspace.axis, -step.dy * 0.01, true);
      } else if (drag.kind === "phone") {
        drag.translation = [drag.translation[0] + worldD[0], drag.translation[1] + worldD[1], drag.translation[2] + worldD[2]];
        applyRigidPhone(dispatch, drag.translation, true);
      } else if (drag.kind === "d_M") {
        drag.d_M = Math.max(0.25, drag.d_M - step.dy * 0.004);
        applyMirrorDistance(dispatch, drag.d_M, true);
      } else if (drag.kind === "window") {
        drag.uv = [drag.uv[0] + step.dx * 0.001, drag.uv[1] - step.dy * 0.001];
        applyMirrorWindow(dispatch, drag.uv, true);
      } else if (drag.kind === "crop") {
        drag.pan = [drag.pan[0] + step.dx * 0.001, drag.pan[1] - step.dy * 0.001];
        applyCropPan(dispatch, drag.pan, true);
      } else if (drag.kind === "q") {
        drag.offset = [drag.offset[0] + step.dx * 0.001, drag.offset[1] - step.dy * 0.001];
        applyQOffset(dispatch, drag.offset, true);
      }
      paintScene();
    },
    onUp(ev, p) {
      machine.end(p.id);
      dispatch.endGesture();
      drag = null;
      paintHud();
      paintScene();
    },
    onDolly(factor) {
      if (scene3d.workspace.editor_view === "CAMERA") return;
      scene3d.dolly(factor);
      paintScene();
    },
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select")) return;
    const meta = e.ctrlKey || e.metaKey;
    if (!meta) return;
    if ((e.key === "z" || e.key === "Z") && e.shiftKey) {
      e.preventDefault();
      app.dispatch("REDO");
      paintHud();
      paintScene();
    } else if (e.key === "z" || e.key === "Z") {
      e.preventDefault();
      app.dispatch("UNDO");
      paintHud();
      paintScene();
    } else if (e.key === "y" || e.key === "Y") {
      e.preventDefault();
      app.dispatch("REDO");
      paintHud();
      paintScene();
    }
  });

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => paintScene()).observe(stage);
  } else {
    window.addEventListener("resize", paintScene);
  }

  paintHud();
  paintScene();
  return app;
}
