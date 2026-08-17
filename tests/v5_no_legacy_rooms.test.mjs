import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.resolve(here, rel), "utf8");

test("v5 interface architecture · no legacy POSE/SCENE workspace room path remains", () => {
  const files = [
    "../src/ui/app_shell.js",
    "../src/app/facade.js",
    "../src/app/actions.js",
    "../src/scene/requested_state.js",
    "../src/render/overlays.js",
  ].map(read);
  for (const src of files) {
    assert.doesNotMatch(src, /workspace\.mode/);
    assert.doesNotMatch(src, /kind\s*===?\s*["'](?:POSE|SCENE)["']/);
    assert.doesNotMatch(src, /kind\s*:\s*["'](?:POSE|SCENE)["']/);
  }
});
