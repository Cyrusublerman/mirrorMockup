import { createApp } from "../app/facade.js";
import { ACTION_NAMES } from "../app/actions.js";
import { createScene3D } from "../render/scene_3d.js";
import { drawOverlays } from "../render/overlays.js";
import { diagnosticsText } from "../render/diagnostics.js";
import { bindNumeric } from "./numeric_entry.js";
import { renderContext } from "./contextual_controls.js";
import { drawReference } from "./reference_overlay.js";

export async function boot(root) {
  const app = createApp();
  root.innerHTML = layout();
  const canvas = root.querySelector("#scene");
  const overlay = root.querySelector("#overlay");
  const hud = root.querySelector("#hud");
  const context = root.querySelector("#context");
  const diag = root.querySelector("#diag");
  const scene3d = await createScene3D(canvas, app);

  function refresh() {
    const req = app.getRequested();
    const eff = app.getEffective();
    scene3d.sync();
    overlay.width = canvas.clientWidth;
    overlay.height = canvas.clientHeight;
    drawOverlays(overlay.getContext("2d"), req, eff, overlay.width, overlay.height);
    drawReference(root.querySelector("#ref"), req);
    hud.textContent = `${req.workspace.mode} · warp ${req.recursion.mode} · ${eff.view.segment} · ${eff.transaction}`;
    diag.textContent = diagnosticsText(eff, req);
    context.innerHTML = renderContext(req, eff);
    bindNumeric(context, (name, payload) => {
      app.dispatch(name, payload);
      refresh();
    });
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
    const name = t.dataset.action;
    if (!ACTION_NAMES.includes(name) && name !== "SET_WORKSPACE_MODE") return;
  });
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
      ${["POSE", "SCENE", "COMPOSITION", "RECURSION", "INSPECT"].map((m) => `<button data-mode="${m}">${m}</button>`).join("")}
    </div>
    <label>warp <select id="warp"><option>OFF</option><option>AUTO</option><option>ADVANCED</option></select></label>
    <label>τ <input id="tau" type="range" min="0" max="4" step="0.01" value="0"></label>
    <button id="export">EXPORT IMAGE</button>
    <span id="hud"></span>
  </div>
  <div class="main">
    <aside id="ref" class="ref"></aside>
    <div class="stage">
      <canvas id="scene"></canvas>
      <canvas id="overlay"></canvas>
    </div>
    <aside class="right">
      <div id="context"></div>
      <pre id="diag"></pre>
    </aside>
  </div>`;
}
