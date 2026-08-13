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
  overscroll-behavior: none;
  touch-action: none;
  background: var(--mp-canvas);
  color: var(--mp-ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
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
  gap: 4px;
  align-items: stretch;
  padding: 6px;
  background: var(--mp-panel);
  border-bottom: 1px solid var(--mp-line);
  flex: 0 0 auto;
  overflow: hidden;
}
.mp-strip[data-strip] > .mp-room {
  flex: 1 1 0;
  min-width: 0;
}
.mp-room, .mp-chip, .mp-more {
  border: 1px solid var(--mp-ink);
  background: var(--mp-panel);
  color: var(--mp-ink);
  border-radius: 999px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 8px;
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-room.is-on, .mp-chip.is-on { background: var(--mp-ink); color: #fff; }
.mp-room:focus-visible, .mp-chip:focus-visible, .mp-more:focus-visible {
  outline: 2px solid var(--mp-action);
  outline-offset: 2px;
}
.mp-more { flex: 0 0 44px; padding: 0; }
.mp-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 64dvh;
  background: var(--mp-canvas);
  touch-action: none;
}
#scene, #overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
#overlay { pointer-events: none; }
.mp-views {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mp-views .mp-chip {
  min-height: 36px;
  min-width: 36px;
  padding: 0 8px;
  font-size: 10px;
  background: rgba(255,255,255,0.88);
}
.mp-inset {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 26%;
  min-width: 88px;
  max-width: 140px;
  aspect-ratio: 3 / 4;
  border: 2px solid var(--mp-action);
  border-radius: 10px;
  overflow: hidden;
  background: #111;
  z-index: 3;
  touch-action: none;
}
.mp-inset canvas { width: 100%; height: 100%; display: block; }
.mp-inset-lab {
  position: absolute;
  left: 4px; right: 4px; bottom: 4px;
  color: #fff;
  font-size: 9px;
  letter-spacing: 0.08em;
  pointer-events: none;
}
.mp-toast {
  position: absolute;
  left: 8px; right: 8px; top: 8px;
  z-index: 4;
  background: rgba(255,255,255,0.92);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--mp-warn);
  display: none;
}
.mp-toast.is-on { display: block; }
.mp-hud {
  flex: 0 0 auto;
  max-height: 26dvh;
  background: var(--mp-panel);
  border-top: 1px solid var(--mp-line);
  padding: 8px 10px 10px;
  border-radius: 16px 16px 0 0;
}
.mp-sel { font-size: 14px; font-weight: 600; }
.mp-row { display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto; margin-top: 8px; }
.mp-status { margin-top: 8px; font-size: 12px; color: var(--mp-muted); display: flex; gap: 8px; align-items: center; }
.mp-valid.ok { color: var(--mp-ok); }
.mp-valid.bad { color: var(--mp-err); }
.mp-inspect, .mp-sheet, .mp-menu {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  max-height: 72dvh;
  background: var(--mp-panel);
  border-top: 1px solid var(--mp-line);
  border-radius: 16px 16px 0 0;
  z-index: 6;
  display: none;
  overflow: auto;
  padding: 14px;
}
.mp-inspect.is-open, .mp-sheet.is-open, .mp-menu.is-open { display: block; }
.mp-inspect header, .mp-sheet header, .mp-menu header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.mp-kv { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--mp-line); }
.mp-sheet label { display: flex; justify-content: space-between; gap: 8px; margin: 8px 0; align-items: center; font-size: 13px; }
.mp-sheet input { min-height: 44px; max-width: 140px; font: inherit; }
.mp-menu .mp-row { flex-wrap: wrap; }
#boot-fail { margin: 24px; max-width: 40rem; }
@media (min-width: 900px) {
  .mp-app { display: grid; grid-template-columns: minmax(0,1fr) 300px; grid-template-rows: auto minmax(0,1fr) auto; }
  .mp-strip { grid-column: 1 / -1; }
  .mp-stage { grid-column: 1; grid-row: 2; min-height: 0; }
  .mp-hud { grid-column: 1; grid-row: 3; max-height: none; border-radius: 0; }
  .mp-inspect { position: relative; grid-column: 2; grid-row: 2 / 4; display: block; max-height: none; border-top: 0; border-left: 1px solid var(--mp-line); border-radius: 0; }
  .mp-inspect:not(.is-open) { display: none; }
  .mp-views { flex-direction: row; }
}
`;

export function injectShellCss(doc = document) {
  let el = doc.getElementById("mirror-shell-css");
  if (!el) {
    el = doc.createElement("style");
    el.id = "mirror-shell-css";
    doc.head.appendChild(el);
  }
  el.textContent = SHELL_CSS;
}
