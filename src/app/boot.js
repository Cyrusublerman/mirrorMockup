import { createApp } from "./facade.js";
import { bootUi } from "../ui/app_shell.js";

function injectSafetyCss(doc) {
  let el = doc.getElementById("mirror-safety-css");
  if (!el) {
    el = doc.createElement("style");
    el.id = "mirror-safety-css";
    doc.head.appendChild(el);
  }
  el.textContent = `
.mp-toast { pointer-events: none; left: 64px; right: 8px; top: 8px; }
.mp-views .mp-chip { min-height: 44px; min-width: 44px; }
.mp-stage > .mp-comp { display: none !important; }
@media (min-width: 1100px) { .mp-toast { left: 8px; top: 60px; } }
`;
}

export async function boot(root) {
  const app = createApp();
  await bootUi(root, app);
  injectSafetyCss(root.ownerDocument || document);
  return app;
}
