import json
from playwright.sync_api import sync_playwright
URL="http://127.0.0.1:8777/remote.html?repo=http://127.0.0.1:8777/"
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":393,"height":812})
    pg.goto(URL, wait_until="networkidle", timeout=60000); pg.wait_for_timeout(6000)
    # Reach into the live three.js scene by monkeypatching before boot is not possible now,
    # so instead re-create the loader path the app uses and measure resolution + bind mode.
    r = pg.evaluate("""async () => {
      const base = window.MIRROR_REPO;
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const buf = await (await fetch(base+'fixtures/P0/base_female_rigged.glb')).arrayBuffer();
      const gltf = await new Promise((ok,err)=> new GLTFLoader().parse(buf,'',ok,err));
      const SK = await import(base+'src/domains/body/skeleton.js');
      const runtime=new Set(), original=new Set();
      let skinned=0, bindModes=new Set();
      gltf.scene.traverse(o=>{
        if(o.isBone){ runtime.add(o.name); original.add(o.userData?.name ?? o.name); }
        if(o.isSkinnedMesh){ skinned++; bindModes.add(o.bindMode); }
      });
      const sem = Object.values(SK.SEMANTIC);
      const byRuntime = sem.filter(n=>runtime.has(n)).length;
      const byOriginal = sem.filter(n=>original.has(n)).length;
      // what a clone shares
      const clone = gltf.scene.clone(true);
      let sharedSkeleton=false, cloneBind=null;
      const orig=[], cl=[];
      gltf.scene.traverse(o=>{ if(o.isSkinnedMesh) orig.push(o); });
      clone.traverse(o=>{ if(o.isSkinnedMesh) cl.push(o); });
      if(orig.length && cl.length){ sharedSkeleton = (orig[0].skeleton === cl[0].skeleton); cloneBind = cl[0].bindMode; }
      return { skinnedMeshes:skinned, bindModes:[...bindModes], bonesTotal:runtime.size,
               semanticTotal:sem.length, resolvedByRuntimeName:byRuntime, resolvedByOriginalName:byOriginal,
               cloneSharesSkeleton:sharedSkeleton, cloneBindMode:cloneBind,
               threeRevision: THREE.REVISION };
    }""")
    print(json.dumps(r, indent=1))
    b.close()
