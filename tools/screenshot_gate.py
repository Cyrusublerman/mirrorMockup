#!/usr/bin/env python3
"""ACC-SHOT-01: capture four canonical v5 UI screenshots and compare reviewed baselines."""
from __future__ import annotations
import hashlib, json, shutil, subprocess, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"tests"/"screenshots"/"baseline"
CURRENT=ROOT/"tests"/"screenshots"/"current"
REVIEW=ROOT/"tests"/"screenshots"/"review.json"
PROFILE=ROOT/"tests"/"screenshots"/".chrome-profile"
SHOTS=[("phone-393x852",393,852),("phone-430x932",430,932),("tablet-768x1024",768,1024),("desktop-1280x800",1280,800)]
MIN_RENDER_BYTES=20_000
BUDGETS=(8_000,16_000,30_000)

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def chrome()->str:
    for name in ("google-chrome","google-chrome-stable","chromium","chromium-browser"):
        p=shutil.which(name)
        if p:return p
    raise RuntimeError("ACC-SHOT-01 requires Chrome/Chromium")

def capture_one(binary:str,name:str,w:int,h:int)->Path:
    out=CURRENT/f"{name}.png"
    for budget in BUDGETS:
        out.unlink(missing_ok=True)
        cmd=[
            binary,"--headless=new","--no-sandbox","--disable-dev-shm-usage",
            "--ignore-gpu-blocklist","--enable-webgl","--use-angle=swiftshader",
            f"--user-data-dir={PROFILE}",f"--window-size={w},{h}","--hide-scrollbars",
            f"--virtual-time-budget={budget}",f"--screenshot={out}",
            f"http://127.0.0.1:8765/index.html?acc-shot={name}",
        ]
        subprocess.run(cmd,cwd=ROOT,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=60)
        if out.exists() and out.stat().st_size>=MIN_RENDER_BYTES:
            return out
    size=out.stat().st_size if out.exists() else 0
    raise RuntimeError(f"ACC-SHOT-01 partial boot for {name}: {size} bytes after retries")

def capture():
    CURRENT.mkdir(parents=True,exist_ok=True)
    for p in CURRENT.glob("*.png"):p.unlink()
    shutil.rmtree(PROFILE,ignore_errors=True)
    PROFILE.mkdir(parents=True,exist_ok=True)
    server=subprocess.Popen([sys.executable,"-m","http.server","8765","--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        time.sleep(.5);binary=chrome()
        for name,w,h in SHOTS:capture_one(binary,name,w,h)
    finally:
        server.terminate()
        try:server.wait(timeout=3)
        except subprocess.TimeoutExpired:server.kill()
        shutil.rmtree(PROFILE,ignore_errors=True)

def verify():
    if not REVIEW.exists():raise RuntimeError("ACC-SHOT-01 manual review manifest missing")
    review=json.loads(REVIEW.read_text())
    if review.get("spec")!="Mirror_Portrait_UI_Spec_v5" or review.get("reviewed") is not True:raise RuntimeError("ACC-SHOT-01 baselines are not explicitly reviewed against v5")
    manifest=review.get("sha256",{})
    errors=[]
    for name,_,_ in SHOTS:
        fn=f"{name}.png";b=BASE/fn;c=CURRENT/fn
        if not b.exists():errors.append(f"missing baseline {fn}");continue
        bs=sha(b);expected=manifest.get(fn)
        if bs!=expected:errors.append(f"manual-review hash stale for {fn}: {bs} != {expected}")
        if not c.exists():errors.append(f"missing current {fn}");continue
        cs=sha(c)
        if cs!=bs:errors.append(f"screenshot diff {fn}: current {cs} baseline {bs}")
    if errors:raise RuntimeError("ACC-SHOT-01 failed\n"+"\n".join(errors))

if __name__=="__main__":
    capture()
    if "--capture-only" not in sys.argv:verify()
    print(json.dumps({"shots":[x[0] for x in SHOTS],"current":str(CURRENT),"verified":"--capture-only" not in sys.argv}))
