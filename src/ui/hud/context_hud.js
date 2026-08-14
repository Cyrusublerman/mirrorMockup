import { ContextualDock } from "./contextual_dock.js";

const dock = new ContextualDock();

export function mountContextHud(el, workspace, proj, handlers) {
  dock.mount(el, workspace, proj, handlers);
}
