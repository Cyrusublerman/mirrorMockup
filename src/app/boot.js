import { createApp } from "./facade.js";
import { bootUi } from "../ui/app_shell.js";

export async function boot(root) {
  const app = createApp();
  const ui = await bootUi(root, app);
  const shot = typeof location !== "undefined" ? new URLSearchParams(location.search).get("shot") : null;
  if (shot && ui) await applyShot(ui, shot);
  return ui || app;
}

async function applyShot(ui, shot) {
  const { workspace, viewState, scene3d, paintHud, paintSceneNow, app } = ui;
  if (shot === "scene") {
    workspace.room = "SOLVE";
    workspace.phaseState?.setPhase("SOLVE");
    scene3d.setRoom("SCENE");
    app.dispatch("SET_PHASE", { phase: "SOLVE" }, { preview: true });
  }
  if (shot === "pose-sel") {
    workspace.selected = { kind: "joint", id: "wrist_R", label: "Joint wrist_R", axis: "BEND" };
    app.dispatch("SET_SELECTION", { selection: "wrist_R" }, { preview: true });
  }
  if (shot === "capture") {
    viewState.setMainPane("CAPTURE");
  }
  paintHud();
  paintSceneNow();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  paintSceneNow();
  await new Promise((r) => setTimeout(r, 250));
  paintSceneNow();
}
