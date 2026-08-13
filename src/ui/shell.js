const SHELL_CSS = `
html, body { margin: 0; height: 100%; height: 100dvh; }
#app.shell, #app:has(.stage) {
  height: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: #111;
  background: #f6f4ef;
}
.top {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #ddd;
  background: #fff;
  flex-wrap: wrap;
  flex: 0 0 auto;
}
.modes { display: flex; gap: 6px; flex-wrap: wrap; }
.modes button {
  border: 1px solid #111;
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font: inherit;
}
.modes button[aria-current="true"] { background: #111; color: #fff; }
.top label { display: flex; align-items: center; gap: 6px; margin: 0; }
#hud { margin-left: auto; font-size: 12px; }
.main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 55vh;
  min-height: 55dvh;
  background: #d9d4cb;
}
#scene, #overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
#overlay { pointer-events: none; }
.dock {
  flex: 0 1 38vh;
  overflow: auto;
  background: #fff;
  border-top: 1px solid #ddd;
  font-size: 12px;
}
.ref, .right { padding: 10px; }
.ref h3 { margin: 0 0 6px; font-size: 13px; }
.ref details { margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 2px 0; vertical-align: top; }
.panel h3 { margin: 0 0 8px; }
label { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; align-items: center; }
input, select, button { font: inherit; }
input, select { max-width: 120px; }
pre { white-space: pre-wrap; font-size: 11px; margin: 8px 0 0; }
@media (min-width: 900px) {
  .main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
    grid-template-rows: minmax(0, 1fr);
  }
  .stage { min-height: 0; grid-column: 1; grid-row: 1; }
  .dock {
    grid-column: 2;
    grid-row: 1;
    flex: none;
    border-top: 0;
    border-left: 1px solid #ddd;
    max-height: none;
  }
}
`;

export function injectShellCss(doc = document) {
  if (doc.getElementById("mirror-shell-css")) return;
  const el = doc.createElement("style");
  el.id = "mirror-shell-css";
  el.textContent = SHELL_CSS;
  doc.head.appendChild(el);
}
