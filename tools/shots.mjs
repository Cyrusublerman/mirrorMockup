import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "tests/shots");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      let path = decodeURIComponent(url.pathname);
      if (path === "/") path = "/index.html";
      try {
        if (path === "/index.html") {
          let html = await readFile(join(ROOT, "index.html"), "utf8");
          html = html.replaceAll(
            "https://cdn.jsdelivr.net/npm/three@0.170.0/",
            "/node_modules/three/",
          );
          res.writeHead(200, { "content-type": MIME[".html"] });
          res.end(html);
          return;
        }
        const buf = await readFile(join(ROOT, path));
        res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
        res.end(buf);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function cdpSession(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  async function send(method, params = {}) {
    await ready;
    const i = ++id;
    return new Promise((resolve, reject) => {
      pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  }
  return { ws, send, ready };
}

async function waitJson(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r.json();
    } catch {
      /* retry */
    }
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error("cdp not ready " + url);
}

const SHOTS = [
  ["pose-iso.png", "null"],
  ["pose-sel.png", "'pose-sel'"],
  ["scene.png", "'scene'"],
  ["capture.png", "'capture'"],
];

const server = await serve();
const port = server.address().port;
const dbg = 9224;
const profile = `/tmp/chrome-shot-${process.pid}`;
const chrome = process.env.CHROME || "google-chrome";
const child = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-extensions",
  "--no-first-run",
  "--hide-scrollbars",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
  `--remote-debugging-port=${dbg}`,
  `--user-data-dir=${profile}`,
  "--window-size=390,844",
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

await mkdir(OUT, { recursive: true });
try {
  const version = await waitJson(`http://127.0.0.1:${dbg}/json/version`);
  const list = await waitJson(`http://127.0.0.1:${dbg}/json/list`);
  const page = list.find((t) => t.type === "page") || list[0];
  const wsUrl = page?.webSocketDebuggerUrl || version.webSocketDebuggerUrl;
  const { ws, send } = cdpSession(wsUrl);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  });
  await send("Page.navigate", { url: `http://127.0.0.1:${port}/` });
  const booted = await send("Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      const t = setInterval(() => {
        if (window.__MIRROR__ && document.documentElement.dataset.booted === "1") {
          clearInterval(t);
          resolve(true);
        }
      }, 50);
      setTimeout(() => { clearInterval(t); resolve(!!window.__MIRROR__); }, 20000);
    })`,
    awaitPromise: true,
  });
  if (!booted.result?.value) throw new Error("app did not boot");
  await send("Runtime.evaluate", {
    expression: `new Promise((r) => setTimeout(r, 400))`,
    awaitPromise: true,
  });
  for (const [name, shot] of SHOTS) {
    await send("Runtime.evaluate", {
      expression: `(async () => {
        const ui = window.__MIRROR__;
        const { workspace, viewState, scene3d, paintHud, paintSceneNow, app } = ui;
        viewState.setMainPane("EDITOR");
        viewState.setEditorView("ISO");
        workspace.room = "DECLARE";
        workspace.selected = null;
        scene3d.setRoom("POSE");
        if (${shot} === "scene") {
          workspace.room = "SOLVE";
          scene3d.setRoom("SCENE");
          app.dispatch("SET_PHASE", { phase: "SOLVE" }, { preview: true });
        }
        if (${shot} === "pose-sel") {
          workspace.selected = { kind: "joint", id: "wrist_R", label: "Joint wrist_R", axis: "BEND" };
          app.dispatch("SET_SELECTION", { selection: "wrist_R" }, { preview: true });
        }
        if (${shot} === "capture") viewState.setMainPane("CAPTURE");
        paintHud();
        paintSceneNow();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        paintSceneNow();
        return true;
      })()`,
      awaitPromise: true,
    });
    await send("Runtime.evaluate", {
      expression: `new Promise((r) => setTimeout(r, 200))`,
      awaitPromise: true,
    });
    const png = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const buf = Buffer.from(png.data, "base64");
    if (buf.length < 2000) throw new Error(`shot ${name} too small (${buf.length})`);
    await writeFile(join(OUT, name), buf);
    console.log("wrote", join(OUT, name), buf.length);
  }
  ws.close();
} finally {
  child.kill("SIGKILL");
  server.close();
}
