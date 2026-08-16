export const SHELL_CSS = `
:root{
  --mp-canvas:#FCFBF8;--mp-panel:#FFFFFF;--mp-ink:#111111;--mp-muted:#6F685E;
  --mp-action:#C41E63;--mp-ref:#2A3FB8;--mp-ok:#1E7A4C;--mp-warn:#A96A05;
  --mp-err:#B03A0B;--mp-line:#E6E1D8;--mp-grid:#F1EDE5;
}
*{box-sizing:border-box}
html,body,#app{margin:0;height:100%;height:100dvh;overflow:hidden;overscroll-behavior:none;touch-action:none;background:var(--mp-canvas);color:var(--mp-ink);font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
button,input{font:inherit}
.mp-app{height:100%;height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:var(--mp-canvas)}
.mp-strip{display:flex;flex-wrap:nowrap;gap:4px;align-items:stretch;padding:6px;background:var(--mp-panel);border-bottom:1px solid var(--mp-line);flex:0 0 auto;overflow:hidden}
.mp-strip[data-strip]>.mp-room{flex:1 1 0;min-width:0}
.mp-room,.mp-chip,.mp-more{border:1px solid var(--mp-ink);background:var(--mp-panel);color:var(--mp-ink);border-radius:999px;min-height:44px;min-width:44px;padding:0 8px;font-size:11px;letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mp-room.is-on,.mp-chip.is-on{background:var(--mp-ink);color:#fff}
.mp-room:focus-visible,.mp-chip:focus-visible,.mp-more:focus-visible{outline:2px solid var(--mp-action);outline-offset:2px}
.mp-more{flex:0 0 44px;padding:0}
.mp-output-pane{position:relative;flex:2 1 0;min-height:20dvh;background:#F7F9FA;border-bottom:1px solid var(--mp-line);overflow:hidden;touch-action:none}
.mp-output-webgl,.mp-output-product{position:absolute;inset:0;width:100%;height:100%;display:block}
.mp-output-product[hidden],.mp-output-webgl[hidden]{display:none}
.mp-inset-lab{position:absolute;left:8px;top:8px;z-index:3;padding:3px 6px;background:rgba(252,251,248,.88);font:10px ui-monospace,monospace;letter-spacing:.08em;pointer-events:none}
.mp-output-controls{position:absolute;left:6px;right:6px;bottom:6px;z-index:4}
.mp-output-controls.mp-row,.mp-output-rail{display:flex;gap:4px;overflow-x:auto;margin:0}
.mp-output-rail .mp-chip{background:rgba(255,255,255,.9);font-size:9px;min-height:38px}
.mp-output-rail .mp-chip.is-on{background:var(--mp-ink);color:#fff}
.mp-swap-rail{height:18px;flex:0 0 18px;background:var(--mp-grid);border-bottom:1px solid var(--mp-line);position:relative;display:flex;align-items:center;justify-content:center}
.mp-swap-rail:before{content:"";position:absolute;left:15%;right:15%;height:1px;background:var(--mp-muted);opacity:.45}
.mp-swap{position:relative;z-index:1;min-height:26px;height:26px;background:var(--mp-grid);font:9px ui-monospace,monospace;padding:0 10px}
.mp-stage{position:relative;flex:3 1 0;min-height:28dvh;background:var(--mp-canvas);touch-action:none;overflow:hidden}
#scene,#overlay{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#overlay{pointer-events:none}
.mp-views{position:absolute;left:8px;top:8px;z-index:4;display:flex;flex-direction:column;gap:4px}
.mp-views .mp-chip{min-height:40px;min-width:44px;padding:0 7px;font-size:9px;background:rgba(255,255,255,.88)}
.mp-views .mp-chip.is-on{background:var(--mp-ink);color:#fff}
.mp-view-lab{position:absolute;left:8px;bottom:8px;z-index:3;font:10px ui-monospace,monospace;letter-spacing:.08em;color:var(--mp-muted);pointer-events:none}
.mp-toast{position:absolute;left:8px;right:8px;top:56px;z-index:5;background:rgba(255,255,255,.94);border:1px solid var(--mp-warn);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--mp-warn);display:none}
.mp-toast.is-on{display:block}
.mp-diag{position:absolute;left:8px;right:8px;bottom:8px;z-index:3;background:rgba(255,255,255,.95);border:1px solid var(--mp-line);border-radius:8px;padding:8px 12px;font-size:11px;max-height:78%;overflow:auto}
.mp-diag[hidden]{display:none}
.mp-fea-svg{width:100%;max-height:240px;background:#fff;border:1px solid var(--mp-line);margin-top:8px}
.mp-fea-eclipse{fill:none;stroke:var(--mp-err);stroke-width:2}.mp-fea-boundary{stroke:var(--mp-warn);stroke-width:2;stroke-dasharray:5 4;cursor:pointer}.mp-fea-boundary.is-hard{stroke:var(--mp-err);stroke-dasharray:none}.mp-fea-iso{stroke:var(--mp-ref);stroke-width:1;stroke-dasharray:2 4}.mp-fea-ref{fill:var(--mp-ref)}.mp-fea-here{fill:var(--mp-action);stroke:#fff;stroke-width:2}
.mp-hud{flex:0 0 auto;background:var(--mp-panel);border-top:1px solid var(--mp-line);padding:7px 10px 8px;border-radius:14px 14px 0 0;overflow:hidden}
.mp-sel{font-size:13px;font-weight:600;line-height:1.2}.mp-param-row{margin-top:5px}.mp-param-row .mp-chip{min-height:40px}
.mp-row{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;margin-top:7px}
.mp-status{margin-top:5px;font-size:11px;color:var(--mp-muted);display:flex;gap:8px;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mp-valid.ok{color:var(--mp-ok)}.mp-valid.warn{color:var(--mp-warn)}.mp-valid.bad{color:var(--mp-err)}
.mp-input-modes .mp-chip.is-on{background:var(--mp-ink);color:#fff}
.mp-comp{margin-top:6px;max-height:22dvh;overflow:auto}.mp-comp[hidden]{display:none}
.mp-inspect,.mp-sheet,.mp-menu{position:absolute;left:0;right:0;bottom:0;max-height:72dvh;background:var(--mp-panel);border-top:1px solid var(--mp-line);border-radius:14px 14px 0 0;z-index:7;display:none;overflow:auto;padding:14px}
.mp-inspect.is-open,.mp-sheet.is-open,.mp-menu.is-open{display:block}.mp-inspect header,.mp-sheet header,.mp-menu header{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.mp-kv{display:flex;justify-content:space-between;gap:12px;font-size:12px;padding:5px 0;border-bottom:1px solid var(--mp-line)}
.mp-sheet label{display:flex;justify-content:space-between;gap:8px;margin:7px 0;align-items:center;font-size:12px}.mp-sheet input{min-height:40px;width:48%;max-width:150px;border:1px solid var(--mp-line);background:#fff;padding:0 6px}.mp-sheet input[readonly]{background:var(--mp-grid);color:var(--mp-muted)}.mp-menu .mp-row{flex-wrap:wrap}
#boot-fail{margin:24px;max-width:44rem;white-space:pre-wrap}

@media(min-width:760px){
  .mp-app{display:grid;grid-template-columns:minmax(150px,24%) minmax(0,1fr) minmax(170px,26%);grid-template-rows:auto minmax(0,1fr);gap:0}
  .mp-strip{grid-column:1/-1;grid-row:1}
  .mp-sheet.is-persistent{position:relative;display:block;grid-column:1;grid-row:2;left:auto;right:auto;bottom:auto;max-height:none;height:100%;border-radius:0;border-top:0;border-right:1px solid var(--mp-line);z-index:2;padding:10px;overflow:auto}
  .mp-stage{grid-column:2;grid-row:2;min-height:0;z-index:1}
  .mp-output-pane{grid-column:3;grid-row:2;min-height:0;border-bottom:0;border-left:1px solid var(--mp-line)}
  .mp-swap-rail{display:none}
  .mp-hud{grid-column:2;grid-row:2;position:relative;align-self:start;height:0;max-height:0;overflow:visible;z-index:6;padding:0;border:0;background:transparent;pointer-events:none}
  .mp-hud .mp-context,.mp-hud .mp-valid-wrap{display:none}
  .mp-hud .mp-input-wrap{position:absolute;right:8px;top:8px;max-width:78%;pointer-events:auto}
  .mp-hud .mp-input-modes{margin:0;justify-content:flex-end;background:rgba(252,251,248,.86);border-radius:999px;padding:2px}
  .mp-hud .mp-input-modes .mp-chip{min-height:36px;font-size:9px;background:rgba(255,255,255,.94)}
  .mp-hud .mp-input-modes .mp-chip.is-on{background:var(--mp-ink);color:#fff}
  .mp-output-controls{top:8px;bottom:auto;display:flex;flex-direction:column;right:auto;width:calc(100% - 12px)}
  .mp-output-rail{flex-direction:column;overflow-y:auto;overflow-x:hidden}.mp-output-rail .mp-chip{width:100%;background:rgba(255,255,255,.9)}
  .mp-output-rail .mp-chip.is-on{background:var(--mp-ink);color:#fff}
  .mp-inset-lab{top:auto;bottom:8px}.mp-views{flex-direction:row}.mp-inspect{left:auto;width:36%;max-height:90dvh}
}
@media(min-width:1180px){.mp-app{grid-template-columns:260px minmax(0,1fr) 300px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
export function injectShellCss(doc=document){let el=doc.getElementById("mirror-shell-css");if(!el){el=doc.createElement("style");el.id="mirror-shell-css";doc.head.appendChild(el);}el.textContent=SHELL_CSS;}
