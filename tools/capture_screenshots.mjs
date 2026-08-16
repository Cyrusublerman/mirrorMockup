import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/screenshots");
mkdirSync(outDir, { recursive: true });
const URL_ = "http://127.0.0.1:8777/index.html";

const b = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const pg = await b.newPage({ viewport: { width: 393, height: 812 }, deviceScaleFactor: 2 });
await pg.goto(URL_, { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(7000);

async function shot(name) {
  await pg.waitForTimeout(1000);
  await pg.screenshot({ path: resolve(outDir, `${name}.png`) });
}

await shot("01-pose-iso-default");
await pg.locator(".mp-room", { hasText: "SCENE" }).click();
await shot("02-scene-room");
await pg.locator(".mp-room", { hasText: "POSE" }).click();
await pg.locator(".mp-chip", { hasText: "CAMERA" }).click();
await shot("03-capture-prominent");
await pg.locator(".mp-chip", { hasText: "ISO" }).click();
await pg.locator("#scene").click({ position: { x: 200, y: 300 } });
await shot("04-pose-selected");
await b.close();
console.log("saved screenshots to", outDir);
