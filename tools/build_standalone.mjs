import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as esbuild from "esbuild";

const root = process.cwd();
const outDir = path.join(root, "dist");
const outFile = path.join(outDir, "mirror-portrait-standalone.html");
const glbPath = path.join(root, "fixtures", "P0", "base_female_rigged.glb");
const glbBase64 = fs.readFileSync(glbPath).toString("base64");
const sourceSha = process.env.MIRROR_SOURCE_SHA || process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const entry = `
import { boot } from "./src/app/boot.js";

const __MIRROR_SOURCE_SHA__ = ${JSON.stringify(sourceSha)};
const __MIRROR_GLB_B64__ = ${JSON.stringify(glbBase64)};
const __mirrorRaw = atob(__MIRROR_GLB_B64__);
const __mirrorGlb = new Uint8Array(__mirrorRaw.length);
for (let i = 0; i < __mirrorRaw.length; i++) __mirrorGlb[i] = __mirrorRaw.charCodeAt(i);
const __realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = function(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url || String(input);
  if (String(url).replaceAll("\\\\", "/").includes("fixtures/P0/base_female_rigged.glb")) {
    return Promise.resolve(new Response(__mirrorGlb, {
      status: 200,
      headers: { "Content-Type": "model/gltf-binary", "Content-Length": String(__mirrorGlb.byteLength) }
    }));
  }
  return __realFetch(input, init);
};
globalThis.MIRROR_STANDALONE = Object.freeze({ source_sha: __MIRROR_SOURCE_SHA__, offline: true });

window.addEventListener("error", (e) => {
  const root = document.getElementById("app");
  if (!root || root.querySelector(".mp-app")) return;
  const box = document.createElement("div");
  box.id = "boot-fail";
  box.setAttribute("role", "alert");
  const p = document.createElement("p");
  p.textContent = String(e.message || "boot error");
  box.appendChild(p);
  root.replaceChildren(box);
});

boot(document.getElementById("app")).catch((err) => {
  const root = document.getElementById("app");
  const box = document.createElement("div");
  box.id = "boot-fail";
  box.setAttribute("role", "alert");
  const p = document.createElement("p");
  p.textContent = String(err?.message || err || "boot error");
  box.appendChild(p);
  root.replaceChildren(box);
});
`;

const built = await esbuild.build({
  stdin: {
    contents: entry,
    resolveDir: root,
    sourcefile: "standalone-entry.mjs",
    loader: "js",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
  treeShaking: true,
  charset: "utf8",
});

let script = built.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="mirror-source-sha" content="${sourceSha}">
<meta name="mirror-build" content="standalone-offline">
<title>Mirror Portrait Tool · Standalone</title>
<style>
html,body,#app{margin:0;height:100%;height:100dvh;overflow:hidden;overscroll-behavior:none;background:#fcfbf8}
#standalone-stamp{position:fixed;right:6px;bottom:4px;z-index:9999;font:8px/1.2 ui-monospace,monospace;color:#6f685e;opacity:.45;pointer-events:none}
</style>
</head>
<body>
<div id="app"></div>
<div id="standalone-stamp" aria-hidden="true">offline · ${sourceSha.slice(0,12)}</div>
<script type="module">${script}</script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html);
const stat = fs.statSync(outFile);
console.log(JSON.stringify({ outFile, bytes: stat.size, sourceSha, embeddedGlbBytes: fs.statSync(glbPath).size }));
