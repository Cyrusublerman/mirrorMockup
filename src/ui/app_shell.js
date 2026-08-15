import { injectShellCss } from "./shell.js";
import { createWorkspaceState } from "./state/workspace_state.js";
import { ViewState } from "./state/view_state.js";
import { createInteractionMachine } from "./state/interaction_state_machine.js";
import { createDispatchAdapter } from "./adapters/action_dispatch_adapter.js";
import { projectForHud } from "./adapters/selector_projection_adapter.js";
import { mountTopModeStrip } from "./hud/top_mode_strip.js";
import { mountContextHud } from "./hud/context_hud.js";
import { mountValidityStrip } from "./hud/validity_strip.js";
import { mountInspectDrawer } from "./hud/inspect_drawer.js";
import { mountPrecisionSheet } from "./hud/precision_sheet.js";
import { mountViewStrip } from "./hud/view_strip.js";
import { TransactionCard } from "./hud/transaction_card.js";
import { FeasiblePanel } from "./hud/feasible_panel.js";
import { ElevationPanel } from "./hud/elevation_panel.js";
import { InputModeStrip } from "./hud/input_mode_strip.js";
import { hitScreenCorner } from "../domains/carrier_p/screen_quad.js";
import { applyScreenCorner } from "./manipulators/screen_quad.js";
import { FeasibleSet } from "../domains/apparatus/feasible_set.js";
import { drawOverlays } from "./overlays/composition_overlay_stack.js";
import { createReferenceLayer } from "./overlays/reference_layer.js";
import { InsetInput } from "./viewport/artwork_camera_inset.js";
import { createEditorViewport } from "./viewport/editor_viewport.js";
import { hitFromEvent } from "./viewport/scene_hit_test.js";
import { labelForHit } from "./viewport/manipulator_layer.js";
import { applySemanticJoint } from "./manipulators/semantic_joint.js";
import { applyEndpointIk } from "./manipulators/endpoint_ik.js";
import { applyRigidPhone } from "./manipulators/rigid_phone.js";
import { applyMirrorDistance, applyMirrorWindow } from "./manipulators/mirror_aperture.js";
import { applyCropPan } from "./manipulators/crop.js";
import { applyQOffset } from "./manipulators/q_portal.js";
import { precisionJointFields } from "./axis_map.js";
import { createScene3D } from "../render/scene_3d.js";
import { letterboxRect } from "../render/capture_camera.js";
import { IK_JOINTS } from "../render/bone_index.js";

function bytesToPngUrl(png) {
  let s = "";
  for (const b of png) s += String.fromCharCode(b);
  return `data:image/png;base64,${btoa(s)}`;
}

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function fail(root, msg, detail) {
  const box = el("div");
  box.id = "boot-fail";
  box.setAttribute("role", "alert");
  const p = el("p");
  p.textContent = msg;
  box.appendChild(p);
  if (detail) {
    const pre = el("pre");
    pre.textContent = detail;
    box.appendChild(pre);
  }
  root.replaceChildren(box);
}

export async function bootUi(root, app) {
  injectShellCss(root.ownerDocument);
  const workspace = createWorkspaceState();
  const viewState = new ViewState();
  workspace.viewState = viewState;
  const machine = createInteractionMachine();
  const dispatch = createDispatchAdapter(app);
  const reference = createReferenceLayer();
  const dockSheet = new TransactionCard();
  const feasiblePanel = new FeasiblePanel();
  const elevationPanel = new ElevationPanel();
  const inputModes = new InputModeStrip();
  const feasibleSet = new FeasibleSet();
  workspace.warp = app.getRequested().recursion.mode;
  workspace.q = app.getRequested().recursion.q;
  workspace.n = app.getRequested().recursion.n;
  workspace.drive_mode = app.getRequested().phone.authority;
  workspace.crop_mode = "FINAL_CROP";

  const shell = el("div", "mp-app");
  const strip = el("div");
  strip.setAttribute("data-strip", "");
  const stage = el("div", "mp-stage");
  const canvas = el("canvas");
  canvas.id = "scene";
  canvas.setAttribute("aria-label", "Scene viewport");
  const overlay = el("canvas");
  overlay.id = "overlay";
  const viewsEl = el("div");
  const viewLab = el("div", "mp-view-lab");
  const insetWrap = el("div", "mp-inset");
  insetWrap.setAttribute("data-inset", "");
  insetWrap.setAttribute("aria-label", "Capture camera inset, tap to swap");
  const insetCanvas = el("canvas");
  insetCanvas.id = "inset";
  const insetLab = el("div", "mp-inset-lab");
  insetLab.textContent = "CAPTURE";
  insetWrap.append(insetCanvas, insetLab);
  const toast = el("div", "mp-toast");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  const compEl = el("div", "mp-comp");
  stage.append(canvas, overlay, viewsEl, viewLab, insetWrap, toast, compEl, diagEl);
  const hud = el("div", "mp-hud");
  const contextEl = el("div");
  const validEl = el("div");
  const modeEl = el("div");
  const diagEl = el("div");
  hud.append(contextEl, modeEl, validEl);
  const inspectEl = el("div", "mp-inspect");
  const sheetEl = el("div", "mp-sheet");
  const menuEl = el("div", "mp-menu");
  const more = el("button", "mp-more");
  more.type = "button";
  more.textContent = "···";
  more.setAttribute("aria-label", "More");
  const file = el("input");
  file.type = "file";
  file.accept = "image/*";
  file.hidden = true;
  shell.append(strip, stage, hud, inspectEl, sheetEl, menuEl, file);
  root.replaceChildren(shell);

  let scene3d;
  try {
    scene3d = await createScene3D(canvas, app, { insetCanvas, viewState });
  } catch (err) {
    fail(root, "Viewport failed to start. WebGL is required.", String(err && err.stack || err));
    throw err;
  }
  scene3d.setEditorView(viewState.editor_view);
  scene3d.setRoom(workspace.room);

  let euler = { bend: 0, tilt: 0, twist: 0 };
  let drag = null;
  let raf = 0;

  function exportProduct(name, filename) {
    const last = app.dispatch(name, { width: 640, height: 640 });
    if (name === "EXPORT_STAGING_PRESCRIPTION") {
      const blob = new Blob([JSON.stringify({ staging: last.export.staging, sidecar: last.export.sidecar, build: app.build }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      return;
    }
    const buf = name === "EXPORT_COMPOSITION_OVERLAY" ? last.export.overlay : name === "EXPORT_REFERENCE_RENDER" ? (last.export.recursive_reference || last.export.png) : last.export.png;
    const a = document.createElement("a");
    a.href = bytesToPngUrl(buf);
    a.download = filename;
    a.click();
  }

  function mountMenu() {
    menuEl.className = "mp-menu" + (workspace.menu ? " is-open" : "");
    menuEl.replaceChildren();
    if (!workspace.menu) return;
    const head = el("header");
    const h = el("strong");
    h.textContent = "MORE";
    const x = el("button", "mp-chip");
    x.type = "button";
    x.textContent = "Close";
    x.addEventListener("click", () => {
      workspace.menu = false;
      paintHud();
    });
    head.append(h, x);
    const row = el("div", "mp-row");
    const mk = (label, fn) => {
      const b = el("button", "mp-chip");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", fn);
      return b;
    };
    row.append(
      mk("INSPECT", () => { workspace.menu = false; workspace.inspect = true; paintHud(); }),
      mk("PRECISION", () => { workspace.menu = false; workspace.precision = true; paintHud(); }),
      mk("REFERENCE", () => file.click()),
      mk("EXPORT FINAL", () => { workspace.menu = false; exportProduct("EXPORT_FINAL_CAMERA", "final.png"); paintHud(); }),
      mk("EXPORT STAGING", () => { workspace.menu = false; exportProduct("EXPORT_STAGING_PRESCRIPTION", "staging.json"); paintHud(); }),
      mk("EXPORT OVERLAY", () => { workspace.menu = false; exportProduct("EXPORT_COMPOSITION_OVERLAY", "overlay.png"); paintHud(); }),
      mk("EXPORT RECURSION", () => { workspace.menu = false; exportProduct("EXPORT_REFERENCE_RENDER", "recursion.png"); paintHud(); }),
    );
    const snaps = el("div", "mp-row");
    for (const id of ["A", "B", "C", "D", "E"]) {
      snaps.appendChild(mk("SAVE " + id, () => {
        app.dispatch("SAVE_SNAPSHOT", { id, kind: workspace.room === "POSE" ? "POSE" : "SCENE" });
        workspace.menu = false;
        paintHud();
      }));
      snaps.appendChild(mk("LOAD " + id, () => {
        const last = app.dispatch("LOAD_SNAPSHOT", { id, label: "Load " + id });
        workspace.menu = false;
        if (!last.error) {
          paintHud();
          paintScene();
        }
      }));
    }
    menuEl.append(head, row, snaps);
  }

  function hudHandlers() {
    return {
      setDrive(mode) {
        workspace.drive_mode = mode;
        app.dispatch("SET_PHONE_AUTHORITY", { authority: mode }, { label: mode.replaceAll("_", " ") });
        paintHud();
        paintScene();
      },
      setBodyMode(kind) {
        workspace.body_mode = kind;
        scene3d.setBodyMode(kind);
        paintHud();
        paintScene();
      },
      loadSnapshot(id) {
        const last = app.dispatch("LOAD_SNAPSHOT", { id, label: "Load " + id });
        if (last.error) app.dispatch("SAVE_SNAPSHOT", { id, kind: "POSE" });
        paintHud();
        paintScene();
      },
      setCropMode(mode) {
        workspace.crop_mode = mode;
        scene3d.capture.mode = mode;
        paintHud();
        paintScene();
      },
      openPrecision() {
        workspace.precision = true;
        paintHud();
      },
      toggleLock(id) {
        const on = !app.getRequested().composition.locks?.[id];
        app.dispatch("SET_LOCK_CHIP", { id, on }, { label: (on ? "Locked " : "Unlocked ") + id });
        paintHud();
        paintScene();
      },
      cycleOpacity() {
        const cur = reference.opacity;
        const next = cur >= 0.8 ? 0.15 : Math.min(1, cur + 0.25);
        reference.setOpacity(next);
        app.dispatch("SET_REFERENCE_REGISTRATION", { opacity: next }, { preview: true });
        paintHud();
        paintScene();
      },
      setWarp(mode) {
        const proj = projectForHud(app);
        if (mode === "AUTO" && !proj.portal?.valid) {
          toast.textContent = "AUTO refused — " + (proj.reasons[0] || "P invalid");
          toast.classList.add("is-on");
          paintHud();
          return;
        }
        workspace.warp = mode;
        app.dispatch("SET_PRINT_GALLERY_MODE", { mode }, { label: "Warp " + mode });
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
    };
  }

  function paintHud() {
    const proj = projectForHud(app);
    mountTopModeStrip(strip, workspace, (room) => {
      workspace.room = room;
      scene3d.setRoom(room);
      app.dispatch("SET_WORKSPACE_MODE", { mode: room });
      paintHud();
      paintScene();
    });
    if (!strip.contains(more)) strip.appendChild(more);
    mountViewStrip(viewsEl, workspace, (id) => {
      viewState.setEditorView(id);
      viewState.setMainPane("EDITOR");
      workspace.editor_view = id;
      scene3d.setEditorView(id);
      insetLab.textContent = "CAPTURE";
      paintHud();
      paintScene();
    });
    mountContextHud(contextEl, workspace, proj, hudHandlers());
    inputModes.mount(modeEl, workspace.input_mode, (id) => {
      workspace.input_mode = id;
      if (id === "NUMBERS") workspace.precision = true;
      if (id === "PLAN") {
        viewState.setEditorView("TOP");
        workspace.editor_view = "TOP";
        scene3d.setEditorView("TOP");
      }
      if (id === "ELEVATION") {
        viewState.setEditorView("LEFT");
        workspace.editor_view = "LEFT";
        scene3d.setEditorView("LEFT");
      }
      paintHud();
      paintScene();
    });
    if (workspace.input_mode === "FEASIBLE") {
      feasiblePanel.mount(diagEl, proj.feasible, feasibleSet.referenceDots());
    } else if (workspace.input_mode === "ELEVATION") {
      elevationPanel.mount(diagEl, proj.aperture_band);
    } else {
      diagEl.hidden = true;
      diagEl.replaceChildren();
    }
    mountValidityStrip(validEl, proj);
    toast.classList.toggle("is-on", false);
    toast.textContent = "";
    dockSheet.mount(compEl, proj.compensation, {
      accept() {
        app.dispatch("ACCEPT_PROPOSAL", {});
        paintHud();
        paintScene();
      },
      release() {
        app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false }, { label: "Release R_P" });
        app.dispatch("SET_LOCK_CHIP", { id: "PHONE_AREA", on: false }, { label: "Unlocked PHONE AREA" });
        paintHud();
        paintScene();
      },
      revert() {
        if (proj.compensation?.from != null) {
          app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false }, { label: "Hold distance" });
          app.dispatch("SET_MIRROR_DISTANCE", { d_M: proj.compensation.from }, { label: "Revert compensation" });
        }
        paintHud();
        paintScene();
      },
    });
    mountInspectDrawer(inspectEl, workspace.inspect, proj, workspace, {
      close() { workspace.inspect = false; paintHud(); },
      toggleOverlay(id) {
        workspace.overlays[id] = !workspace.overlays[id];
        paintHud();
        paintScene();
      },
      toggleLock(id) {
        hudHandlers().toggleLock(id);
      },
      cycleIntent(id, rule) {
        const order = ["REQUIRED", "PERMITTED", "PROHIBITED", "IGNORE", "TARGET"];
        const next = order[(order.indexOf(rule.state) + 1) % order.length];
        app.dispatch("SET_OCCLUSION_INTENT", { id, state: next, min: rule.min, max: rule.max }, { label: "Intent " + id });
        paintHud();
        paintScene();
      },
    });
    mountPrecisionSheet(sheetEl, workspace.precision, precisionFields(), (out) => {
      applyPrecision(out);
      workspace.precision = false;
      paintHud();
      paintScene();
    }, () => {
      workspace.precision = false;
      paintHud();
    });
    mountMenu();
  }

  function precisionFields() {
    const req = app.getRequested();
    const sel = workspace.selected;
    if (sel?.kind === "joint") {
      return precisionJointFields(req.body.pose_targets.btt_euler?.[sel.id]);
    }
    if (sel?.kind === "phone") {
      const t = req.phone.transform_request.translation;
      return [
        { key: "x", label: "X (m)", value: t[0] },
        { key: "y", label: "Y (m)", value: t[1] },
        { key: "z", label: "Z (m)", value: t[2] },
      ];
    }
    if (sel?.id === "d_M") return [{ key: "d_M", label: "d_M (m)", value: req.apparatus.mirror_distance_request_m }];
    if (sel?.kind === "crop") {
      const p = req.camera.crop_request.pan;
      return [
        { key: "u", label: "Crop U", value: p[0] },
        { key: "v", label: "Crop V", value: p[1] },
      ];
    }
    return [{ key: "hfov_deg", label: "HFOV (deg)", value: (req.camera.hfov_request * 180) / Math.PI }];
  }

  function applyPrecision(out) {
    const sel = workspace.selected;
    if (sel?.kind === "joint") {
      app.dispatch("SET_ANATOMICAL_DOF", { joint: sel.id, bend: out.bend || 0, tilt: out.tilt || 0, twist: out.twist || 0 }, { label: "Precision " + sel.id });
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
    if (out.hfov_deg != null) app.dispatch("SET_CAMERA_FOV", { hfov: (out.hfov_deg * Math.PI) / 180 }, { label: "Precision HFOV" });
  }

  function paintSceneNow() {
    scene3d.sync();
    const w = Math.max(1, canvas.clientWidth || stage.clientWidth || 1);
    const h = Math.max(1, canvas.clientHeight || stage.clientHeight || 1);
    const captureMain = viewState.main_pane === "CAPTURE";
    viewLab.textContent = captureMain ? "CAPTURE" : viewState.editor_view;
    insetLab.textContent = captureMain ? "EDITOR" : "CAPTURE";
    const ctx = overlay.getContext("2d");
    if (!captureMain) {
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.width = w;
      overlay.height = h;
      ctx.clearRect(0, 0, w, h);
      return;
    }
    const box = letterboxRect(w, h, 3 / 4);
    overlay.style.left = `${box.x}px`;
    overlay.style.top = `${box.y}px`;
    overlay.style.width = `${box.w}px`;
    overlay.style.height = `${box.h}px`;
    overlay.width = Math.max(1, Math.floor(box.w));
    overlay.height = Math.max(1, Math.floor(box.h));
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const proj = projectForHud(app);
    reference.draw(ctx, overlay.width, overlay.height);
    drawOverlays(ctx, overlay.width, overlay.height, workspace, proj);
  }

  function paintScene() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      paintSceneNow();
    });
  }

  more.addEventListener("click", () => {
    workspace.menu = !workspace.menu;
    paintHud();
  });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    await reference.loadFile(f);
    paintScene();
  });

  function syncInsetLabel() {
    insetLab.textContent = viewState.main_pane === "CAPTURE" ? "EDITOR" : "CAPTURE";
  }

  new InsetInput().bind(insetWrap, {
    cameraEdit: () => workspace.selected?.kind === "camera" || workspace.selected?.kind === "crop" || viewState.main_pane === "CAPTURE",
    getHfov: () => app.getRequested().camera.hfov_request,
    setHfov(hfov) {
      dispatch.startGesture("Changed FOV");
      dispatch.preview("SET_CAMERA_FOV", { hfov });
      paintScene();
    },
    onPinchStart() {
      dispatch.startGesture("Changed FOV");
    },
    onHit(ev) {
      const cam = viewState.main_pane === "CAPTURE" ? scene3d.camera : scene3d.capture.cam;
      const hit = scene3d.hitTest(ev.clientX, ev.clientY, cam, insetWrap.getBoundingClientRect());
      if (!hit) return;
      workspace.selected = { kind: hit.kind, id: hit.id, label: labelForHit(hit), axis: workspace.axis };
      app.dispatch("SET_SELECTION", { selection: hit.id || hit.kind }, { preview: true });
      paintHud();
    },
    onUp() {
      dispatch.endGesture();
    },
    onSwap() {
      scene3d.swapInset();
      workspace.editor_view = scene3d.workspace.editor_view;
      syncInsetLabel();
      paintHud();
      paintScene();
    },
  });

  function beginDragFromHit(hit, req) {
    if (hit.kind === "joint" && IK_JOINTS.includes(hit.id) && workspace.room !== "SCENE") {
      const world = (req.body.pose_targets.endpoint_targets[hit.id] || app.getEffective().skeleton.fk[hit.id] || hit.point).slice();
      drag = { kind: "ik", end: hit.id, world, started: false };
    } else if (hit.kind === "joint") {
      euler = { ...(req.body.pose_targets.btt_euler?.[hit.id] || { bend: 0, tilt: 0, twist: 0 }) };
      drag = { kind: "joint", joint: hit.id, started: false };
    } else if (hit.kind === "phone" || hit.kind === "screen") {
      drag = { kind: hit.kind === "screen" ? "screen_corner" : "phone", translation: req.phone.transform_request.translation.slice(), started: false };
    } else if (hit.kind === "mirror") {
      const id = workspace.selected?.id === "window" ? "window" : "d_M";
      workspace.selected = { kind: "mirror", id, label: id === "window" ? "Mirror window pan" : "Mirror distance" };
      drag = { kind: id, d_M: req.apparatus.mirror_distance_request_m, uv: req.apparatus.mirror_pan_uv_request_m.slice(), started: false };
    } else drag = { kind: "orbit", started: false };
  }

  createEditorViewport(canvas, scene3d, machine, {
    onDown(ev, p) {
      if (viewState.main_pane === "CAPTURE") {
        const box = overlay.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) {
          const uv = [(ev.clientX - box.left) / box.width, (ev.clientY - box.top) / box.height];
          const quad = projectForHud(app).portal?.P?.quad;
          const corner = hitScreenCorner(quad, uv);
          if (corner >= 0) {
            workspace.selected = { kind: "phone", id: "screen_" + corner, label: "Screen corner " + (corner + 1) };
            drag = { kind: "screen_corner", index: corner, translation: app.getRequested().phone.transform_request.translation.slice(), started: false };
            machine.beginSelect(p.id, p);
            paintHud();
            return;
          }
        }
      }
      const hit = hitFromEvent(scene3d, ev);
      if (hit) {
        workspace.selected = { kind: hit.kind, id: hit.id, label: labelForHit(hit), axis: workspace.axis };
        app.dispatch("SET_SELECTION", { selection: hit.id || hit.kind }, { preview: true });
        beginDragFromHit(hit, app.getRequested());
        machine.beginSelect(p.id, p);
        paintHud();
        return;
      }
      if (workspace.selected?.kind === "q") {
        drag = { kind: "q", offset: app.getRequested().content_q.offset.slice(), started: false };
        machine.beginSelect(p.id, p);
        return;
      }
      if (workspace.selected?.kind === "crop") {
        drag = { kind: "crop", pan: app.getRequested().camera.crop_request.pan.slice(), started: false };
        machine.beginSelect(p.id, p);
        return;
      }
      if (workspace.selected?.id === "apparatus") {
        drag = { kind: "apparatus", pan: app.getRequested().apparatus.apparatus_pan_request_m.slice(), started: false };
        machine.beginSelect(p.id, p);
        return;
      }
      if (workspace.selected?.id === "reflected") {
        drag = { kind: "reflected", started: false };
        machine.beginSelect(p.id, p);
        return;
      }
      if (viewState.main_pane !== "CAPTURE") {
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
      if (!drag.started && Math.hypot(step.dx, step.dy) < 2) return;
      if (!drag.started) {
        const labels = {
          ik: "Moved " + drag.end,
          joint: "Rotated " + drag.joint,
          phone: "Moved phone",
          screen_corner: "Dragged screen corner",
          d_M: "Changed mirror distance",
          window: "Panned mirror window",
          crop: "Panned crop",
          q: "Moved Q",
          apparatus: "Panned apparatus",
          reflected: "Panned reflected content",
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
      } else if (drag.kind === "phone" || drag.kind === "screen_corner") {
        drag.translation = [drag.translation[0] + worldD[0], drag.translation[1] + worldD[1], drag.translation[2] + worldD[2]];
        if (drag.kind === "screen_corner") applyScreenCorner(dispatch, drag.translation, true);
        else applyRigidPhone(dispatch, drag.translation, true);
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
      } else if (drag.kind === "apparatus") {
        drag.pan = [drag.pan[0] + step.dx * 0.001, drag.pan[1] - step.dy * 0.001];
        dispatch.preview("PAN_APPARATUS", { pan: drag.pan });
      } else if (drag.kind === "reflected") {
        dispatch.preview("PAN_REFLECTED_CONTENT", { delta: [step.dx * 0.001, -step.dy * 0.001] });
      }
      paintScene();
      if (drag.started && drag.kind !== "orbit") paintHud();
    },
    onUp(ev, p) {
      machine.end(p.id);
      dispatch.endGesture();
      drag = null;
      paintHud();
      paintScene();
    },
    onDolly(factor) {
      if (viewState.main_pane === "CAPTURE") return;
      scene3d.dolly(factor);
      paintScene();
    },
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      workspace.precision = false;
      workspace.inspect = false;
      workspace.menu = false;
      machine.clear();
      paintHud();
      return;
    }
    if (e.target.closest?.("input, textarea, select")) return;
    const meta = e.ctrlKey || e.metaKey;
    if (meta && (e.key === "z" || e.key === "Z") && e.shiftKey) {
      e.preventDefault();
      app.dispatch("REDO");
      paintHud();
      paintScene();
      return;
    }
    if (meta && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      app.dispatch("UNDO");
      paintHud();
      paintScene();
      return;
    }
    if (meta && (e.key === "y" || e.key === "Y")) {
      e.preventDefault();
      app.dispatch("REDO");
      paintHud();
      paintScene();
      return;
    }
    const sel = workspace.selected;
    if (!sel || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const dx = e.key === "ArrowLeft" ? -0.01 : e.key === "ArrowRight" ? 0.01 : 0;
    const dy = e.key === "ArrowDown" ? -0.01 : e.key === "ArrowUp" ? 0.01 : 0;
    if (sel.kind === "phone") {
      const t = app.getRequested().phone.transform_request.translation.slice();
      app.dispatch("MOVE_PHONE", { translation: [t[0] + dx, t[1], t[2] + dy] }, { label: "Nudge phone" });
    } else if (sel.kind === "joint" && IK_JOINTS.includes(sel.id)) {
      const w = (app.getRequested().body.pose_targets.endpoint_targets[sel.id] || app.getEffective().skeleton.fk[sel.id]).slice();
      app.dispatch("MOVE_POSE_TARGET", { end: sel.id, world: [w[0] + dx, w[1], w[2] + dy] }, { label: "Nudge " + sel.id });
    } else if (sel.id === "d_M") {
      const d = app.getRequested().apparatus.mirror_distance_request_m + dy;
      app.dispatch("SET_MIRROR_DISTANCE", { d_M: Math.max(0.25, d) }, { label: "Nudge d_M" });
    }
    paintHud();
    paintScene();
  });

  if (typeof ResizeObserver === "function") new ResizeObserver(() => paintScene()).observe(stage);
  else window.addEventListener("resize", paintScene);

  paintHud();
  paintSceneNow();
  if (typeof document !== "undefined") document.documentElement.dataset.booted = "1";
  const api = { app, workspace, viewState, scene3d, paintHud, paintScene, paintSceneNow };
  if (typeof window !== "undefined") window.__MIRROR__ = api;
  return api;
}

export async function boot(root) {
  const { createApp } = await import("../app/facade.js");
  return bootUi(root, createApp());
}
