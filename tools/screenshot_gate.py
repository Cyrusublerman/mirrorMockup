#!/usr/bin/env python3
"""ACC-SHOT-01: capture four canonical v5 UI screenshots and compare reviewed baselines."""
from __future__ import annotations
import hashlib, json, os, shutil, subprocess, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"tests"/"screenshots"/"baseline"
CURRENT=ROOT/"tests"/"screenshots"/"current"
REVIEW=ROOT/"tests"/"screenshots"/"review.json"
SHOTS=[("phone-393x852",393,852),("phone-430x932",430,932),("tablet-768x1024",768,1024),("desktop-1280x800",1280,800)]

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def chrome()->str:
    for name in ("google-chrome","google-chrome-stable","chromium","chromium-browser"):
        p=shutil.which(name)
        if p:return p
    raise RuntimeError("ACC-SHOT-01 requires Chrome/Chromium")

def capture():
    CURRENT.mkdir(parents=True,exist_ok=True)
    for p in CURRENT.glob("*.png"):p.unlink()
    server=subprocess.Popen([sys.executable,"-m","http.server","8765","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        time.sleep(.5); binary=chrome()
        for name,w,h in SHOTS:
            out=CURRENT/f"{name}.png"
            cmd=[binary,"--headless=new","--no-sandbox","--disable-dev-shm-usage","--ignore-gpu-blocklist","--enable-webgl","--use-angle=swiftshader",f"--window-size={w},{h}","--hide-scrollbars","--virtual-time-budget=6000",f"--screenshot={out}",f"http://127.0.0.1:8765/index.html?acc-shot={name}"]
            subprocess.run(cmd,cwd=ROOT,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=45)
            if not out.exists() or out.stat().st_size<1000:raise RuntimeError(f"screenshot failed: {name}")
    finally:
        server.terminate()
        try:server.wait(timeout=3)
        except subprocess.TimeoutExpired:server.kill()

def verify():
    if not REVIEW.exists():raise RuntimeError("ACC-SHOT-01 manual review manifest missing")
    review=json.loads(REVIEW.read_text())
    if review.get("spec")!="Mirror_Portrait_UI_Spec_v5" or review.get("reviewed") is not True:raise RuntimeError("ACC-SHOT-01 baselines are not explicitly reviewed against v5")
    manifest=review.get("sha256",{})
    errors=[]
    for name,_,_ in SHOTS:
        fn=f"{name}.png"; b=BASE/fn; c=CURRENT/fn
        if not b.exists():errors.append(f"missing baseline {fn}");continue
        bs=sha(b); expected=manifest.get(fn)
        if bs!=expected:errors.append(f"manual-review hash stale for {fn}: {bs} != {expected}")
        if not c.exists():errors.append(f"missing current {fn}");continue
        cs=sha(c)
        if cs!=bs:errors.append(f"screenshot diff {fn}: current {cs} baseline {bs}")
    if errors:raise RuntimeError("ACC-SHOT-01 failed\n"+"\n".join(errors))

if __name__=="__main__":
    capture()
    if "--capture-only" not in sys.argv:verify()
    print(json.dumps({"shots":[x[0] for x in SHOTS],"current":str(CURRENT),"verified":"--capture-only" not in sys.argv}))
