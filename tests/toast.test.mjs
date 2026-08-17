import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectForHud } from "../src/ui/adapters/selector_projection_adapter.js";

function fakeApp(compensation) {
  return {
    build: { app: "test", ui: "test", core: "test", commit: "test" },
    getRequested() {
      return { composition: { targets: [] } };
    },
    getEffective() {
      return {
        visibility: {},
        carrier_p: { valid: true },
        residuals: {},
        constraints: [],
        recursion: {},
        transaction: "PASS",
        compensation,
      };
    },
  };
}

test("Phase 4 · no-op compensation is not projected to the HUD", () => {
  const p = projectForHud(fakeApp({
    variable: "mirror_distance_request_m",
    from: 0.41,
    to: 0.41,
    reason: "preserved_reflected_phone_ratio",
  }));
  assert.equal(p.compensation, null);
});

test("Phase 4 · meaningful compensation remains inspectable", () => {
  const comp = {
    variable: "mirror_distance_request_m",
    from: 0.41,
    to: 0.42,
    reason: "preserved_reflected_phone_ratio",
  };
  assert.equal(projectForHud(fakeApp(comp)).compensation, comp);
});

test("Phase 4 · toast cannot intercept view controls", () => {
  const shell = readFileSync(new URL("../src/ui/shell.js", import.meta.url), "utf8");
  const boot = readFileSync(new URL("../src/app/boot.js", import.meta.url), "utf8");
  assert.match(boot, /\.mp-toast\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(shell + boot, /\.mp-views \.mp-chip\s*\{[^}]*min-height:\s*44px/s);
  assert.match(shell + boot, /\.mp-views \.mp-chip\s*\{[^}]*min-width:\s*44px/s);
});
