import { createApp } from "../app/facade.js";
import { ACTION_NAMES } from "../app/actions.js";
import { createScene3D } from "../render/scene_3d.js";
import { drawOverlays } from "../render/overlays.js";
import { diagnosticsText } from "../render/diagnostics.js";
import { bindNumeric } from "./numeric_entry.js";
import { renderContext } from "./contextual_controls.js";
import { drawReference } from "./reference_overlay.js";
import { injectShellCss } from "./shell.js";

export async function boot(root) {
  injectShellCss(root.ownerDocument);
  const app = createApp();
  root.classList.add("shell");
  root.innerHTML = layout();
  const canvas = root.querySelector("#scene");
  const overlay = root.querySelector("#overlay");
  const hud = root.querySelector("#hud");
  const context = root.querySelector("#context");
  const diag = root.querySelector("#diag");
  const stage = root.querySelector(".stage");
  const scene3d = await createScene3D(canvas, app);

  function sizeOverlay() {
    const w = Math.max(1, canvas.clientWidth || stage.clientWidth || 1);
    const h = Math.max(1, canvas.clientHeight || stage.clientHeight || 1);
    if (overlay.width !== w) overlay.width = w;
    if (overlay.height !== h) overlay.height = h;
    return [w, h];
  }

  function refresh() {
    const req = app.getRequested();
    const eff = app.getEffective();
    scene3d.resize();
    scene3d.sync();
    const [w, h] = sizeOverlay();
    drawOverlays(overlay.getContext("2d"), req, eff, w, h);
    drawReference(root.querySelector("#ref"), req);
    hud.textContent = `${req.workspace.mode} · warp ${req.recursion.mode} · ${eff.view.segment} · ${eff.transaction}`;
    diag.textContent = diagnosticsText(eff, req);
    context.innerHTML = renderContext(req, eff);
    bindNumeric(context, (name, payload) => {
      app.dispatch(name, payload);
      refresh();
    });
    const warp = root.querySelector("#warp");
    const tau = root.querySelector("#tau");
    if (warp) warp.value = req.recursion.mode;
    if (tau) tau.value = String(req.view.tau);
    root.querySelectorAll("[data-mode]").forEach((b) => {
      b.setAttribute("aria-current", b.dataset.mode === req.workspace.mode ? "true" : "false");
    });
  }

  function parsePayload(el) {
    if (!el.dataset.payload) return {};
    try {
      return JSON.parse(el.dataset.payload);
    } catch {
      return {};
    }
  }

  function fireAction(el) {
    const name = el.dataset.action;
    if (!ACTION_NAMES.includes(name) && name !== "SET_WORKSPACE_MODE") return;
    let payload = parsePayload(el);
    if (el.type === "checkbox") payload = { ...payload, on: el.checked };
    if (el.tagName === "SELECT" && el.dataset.field) {
      payload = { ...payload, [el.dataset.field]: el.value };
    }
    app.dispatch(name, payload);
    refresh();
  }

  root.querySelectorAll("[data-mode]").forEach((b) => {
    b.onclick = () => {
      app.dispatch("SET_WORKSPACE_MODE", { mode: b.dataset.mode });
      refresh();
    };
  });
  root.querySelector("#warp").onchange = (e) => {
    app.dispatch("SET_PRINT_GALLERY_MODE", { mode: e.target.value });
    refresh();
  };
  root.querySelector("#tau").oninput = (e) => {
    app.dispatch("SET_VIEW_TRAVERSAL", { tau: Number(e.target.value) });
    refresh();
  };
  root.querySelector("#export").onclick = () => {
    const last = app.dispatch("EXPORT_IMAGE", { width: 640, height: 640 });
    const a = document.createElement("a");
    a.href = bytesToPngUrl(last.export.png);
    a.download = "artwork.png";
    a.click();
    const blob = new Blob([JSON.stringify(last.export.sidecar, null, 2)], { type: "application/json" });
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(blob);
    a2.download = "artwork.json";
    a2.click();
  };
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    if (t.tagName === "SELECT") return;
    fireAction(t);
  });
  root.addEventListener("change", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t || t.tagName !== "SELECT") return;
    fireAction(t);
  });
  window.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select")) return;
    const meta = e.ctrlKey || e.metaKey;
    if (!meta) return;
    if ((e.key === "z" || e.key === "Z") && e.shiftKey && ACTION_NAMES.includes("REDO")) {
      e.preventDefault();
      app.dispatch("REDO");
      refresh();
    } else if ((e.key === "z" || e.key === "Z") && ACTION_NAMES.includes("UNDO")) {
      e.preventDefault();
      app.dispatch("UNDO");
      refresh();
    } else if ((e.key === "y" || e.key === "Y") && ACTION_NAMES.includes("REDO")) {
      e.preventDefault();
      app.dispatch("REDO");
      refresh();
    }
  });
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      scene3d.resize();
      scene3d.sync();
      const [w, h] = sizeOverlay();
      drawOverlays(overlay.getContext("2d"), app.getRequested(), app.getEffective(), w, h);
    }).observe(stage);
  } else {
    window.addEventListener("resize", () => {
      scene3d.resize();
      scene3d.sync();
    });
  }
  refresh();
  return app;
}

function bytesToPngUrl(png) {
  let s = "";
  for (let i = 0; i < png.length; i++) s += String.fromCharCode(png[i]);
  return `data:image/png;base64,${btoa(s)}`;
}

function layout() {
  return `
  <div class="top">
    <div class="modes">
      ${["POSE", "SCENE", "COMPOSITION", "RECURSION", "INSPECT"].map((m) => `<button type="button" data-mode="${m}">${m}</button>`).join("")}
    </div>
    <label>warp <select id="warp"><option>OFF</option><option>AUTO</option><option>ADVANCED</option></select></label>
    <label>τ <input id="tau" type="range" min="0" max="4" step="0.01" value="0"></label>
    <button type="button" id="export">EXPORT IMAGE</button>
    <span id="hud"></span>
  </div>
  <div class="main">
    <div class="stage">
      <canvas id="scene"></canvas>
      <canvas id="overlay"></canvas>
    </div>
    <div class="dock">
      <aside id="ref" class="ref"></aside>
      <aside class="right">
        <div id="context"></div>
        <pre id="diag"></pre>
      </aside>
    </div>
  </div>`;
}
