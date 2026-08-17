import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
function localImports(path){const abs=resolve(root,path),src=readFileSync(abs,"utf8"),dir=dirname(abs);return[...src.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m)=>resolve(dir,m[1]));}

test("integration · app shell local imports all resolve",()=>{for(const p of localImports("src/ui/app_shell.js"))assert.ok(existsSync(p),`missing app shell import ${p}`);});
test("integration · solver local imports all resolve",()=>{for(const p of localImports("src/scene/solve_network.js"))assert.ok(existsSync(p),`missing solver import ${p}`);});
test("integration · v5 production phase strip remains the app shell source",()=>{const shell=readFileSync(resolve(root,"src/ui/app_shell.js"),"utf8");assert.match(shell,/hud\/top_mode_strip\.js/);const strip=readFileSync(resolve(root,"src/ui/hud/top_mode_strip.js"),"utf8");assert.match(strip,/PHASES/);assert.doesNotMatch(strip,/POSE.*SCENE.*RECURSION/s);});
