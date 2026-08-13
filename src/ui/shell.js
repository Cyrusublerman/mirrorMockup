const SHELL_CSS = `
:root {
  --mp-canvas: #F7F5EF;
  --mp-panel: #FFFFFF;
  --mp-ink: #181818;
  --mp-muted: #606060;
  --mp-action: #D82D84;
  --mp-ref: #395BD6;
  --mp-ok: #2E7D4A;
  --mp-warn: #A66800;
  --mp-err: #B53A3A;
  --mp-line: #E4E0D8;
}
html, body, #app {
  margin: 0;
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--mp-canvas);
  color: var(--mp-ink);
  font-family: system-ui, ui-sans-serif, sans-serif;
}
.mp-app {
  height: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--mp-canvas);
}
.mp-strip {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  align-items: center;
  padding: 6px 8px;
  background: var(--mp-panel);
  border-bottom: 1px solid var(--mp-line);
  flex: 0 0 auto;
  overflow-x: auto;
  min-height: 44px;
}
.mp-room, .mp-chip, .mp-icon {
  border: 1px solid var(--mp-ink);
  background: var(--mp-panel);
  color: var(--mp-ink);
  border-radius: 999px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.mp-room.is-on, .mp-chip.is-on {
  background: var(--mp-ink);
  color: #fff;
}
.mp-icon { margin-left: auto; }
.mp-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 60dvh;
  background: var(--mp-canvas);
}
#scene, #overlay, .mp-stage canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
#overlay { pointer-events: none; }
.mp-inset {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 28%;
  min-width: 96px;
  aspect-ratio: 3 / 4;
  border: 2px solid var(--mp-action);
  border-radius: 6px;
  overflow: hidden;
  background: #111;
  z-index: 3;
  touch-action: none;
}
.mp-inset canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.mp-hud {
  flex: 0 0 auto;
  max-height: 30dvh;
  background: var(--mp-panel);
  border-top: 1px solid var(--mp-line);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.mp-context { padding: 8px 10px 4px; }
.mp-sel { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.mp-row { display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.mp-muted { color: var(--mp-muted); font-size: 11px; }
.mp-res { padding: 0 10px 6px; }
.mp-hint { padding: 0 10px 6px; color: var(--mp-muted); font-size: 12px; }
.mp-foot {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 4px 10px 8px;
  font-size: 11px;
}
.mp-valid { display: flex; gap: 8px; align-items: center; }
.mp-valid.ok { color: var(--mp-ok); }
.mp-valid.bad { color: var(--mp-err); }
.mp-cert { display: flex; gap: 8px; margin-left: auto; color: var(--mp-muted); }
.mp-inspect, .mp-sheet {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  max-height: 70dvh;
  background: var(--mp-panel);
  border-top: 1px solid var(--mp-line);
  z-index: 5;
  display: none;
  overflow: auto;
  padding: 12px;
}
.mp-inspect.is-open, .mp-sheet.is-open { display: block; }
.mp-inspect header, .mp-sheet header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.mp-kv { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; padding: 3px 0; border-bottom: 1px solid var(--mp-line); }
.mp-sheet label { display: flex; justify-content: space-between; gap: 8px; margin: 6px 0; align-items: center; font-size: 13px; }
.mp-sheet input { min-height: 44px; max-width: 140px; font: inherit; }
.mp-ghost { color: var(--mp-action); font-size: 12px; padding: 0 10px 6px; }
@media (min-width: 900px) {
  .mp-app { display: grid; grid-template-columns: minmax(0,1fr) 280px; grid-template-rows: auto 1fr auto; }
  .mp-strip { grid-column: 1 / -1; }
  .mp-stage { grid-column: 1; grid-row: 2; min-height: 0; }
  .mp-hud { grid-column: 1; grid-row: 3; max-height: none; }
  .mp-inspect { position: relative; grid-column: 2; grid-row: 2 / 4; display: block; max-height: none; border-top: 0; border-left: 1px solid var(--mp-line); }
  .mp-inspect:not(.is-open) { display: none; }
}
`;

export function injectShellCss(doc = document) {
  if (doc.getElementById("mirror-shell-css")) {
    const el = doc.getElementById("mirror-shell-css");
    el.textContent = SHELL_CSS;
    return;
  }
  const el = doc.createElement("style");
  el.id = "mirror-shell-css";
  el.textContent = SHELL_CSS;
  doc.head.appendChild(el);
}
