# Mirror Portrait — engineering handover

**Baseline:** `origin/HEAD` = `c775d79` ("New spec and requirements")
**Working tree state at handover:** `src/render/scene_3d.js` modified (three uncommitted fixes, see §4), `tests/rig.test.mjs` untracked. Original renderer backed up at `/tmp/scene_3d.bak` — that path will not survive; re-derive from `git diff` instead.

Everything in this document was measured in the running application, not read from source. Where a number appears, it came from a probe you can re-run.

---

## 1. Running and probing it locally

This is the part that will save you the most time. The launcher supports a local origin, so you can run the real app against a working tree without pushing.

```bash
# serve the repo root. setsid matters — a plain & is killed between tool calls
cd /path/to/mirrorMockup
setsid python3 -m http.server 8777 --bind 127.0.0.1 >/tmp/srv.log 2>&1 < /dev/null &
```

Then open:

```
http://127.0.0.1:8777/remote.html?repo=http://127.0.0.1:8777/
```

`remote.html` allowlists `127.0.0.1`, `localhost` and `[::1]` for the `?repo=` parameter and otherwise pins a commit SHA. `?ref=<sha>` and `?cdn=jsdelivr` also work against GitHub.

### Headless

Chromium needs software GL flags or the canvas comes back blank:

```python
b = p.chromium.launch(args=[
    "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"
])
pg = b.new_page(viewport={"width":393,"height":812}, device_scale_factor=2)
pg.goto(URL, wait_until="networkidle", timeout=60000)
pg.wait_for_timeout(6000)   # GLB load + first solve; less than this and you shoot an empty scene
```

### Probing domain state from inside the page

The app does not expose globals, but `window.MIRROR_REPO` is set and the modules are plain ESM, so you can re-import them in the page context and run the real solver:

```js
const base = window.MIRROR_REPO;
const RS = await import(base + 'src/scene/requested_state.js');
const SN = await import(base + 'src/scene/solve_network.js');
const out = SN.solve(RS.defaultRequestedState());
```

Same trick for `three` and `GLTFLoader` via the importmap (`three`, `three/addons/`), which is how the bone-resolution numbers below were obtained.

### Clicking

**Use `force=True` on view-chip clicks.** The compensation toast intercepts pointer events over the view rail; see §5.1.

---

## 2. Verified state at `c775d79`

Boots clean. No boot error, no page errors, no console output. All 8 test files pass. Both facts are true and neither means anything, because nothing in either specification is enforced by a test.

| measurement | value | how |
|---|---|---|
| semantic controls resolved by `Object3D.name` | **6 of 25** | GLTFLoader in-page |
| resolved by `userData.name` | **25 of 25** | same |
| bones with reserved characters in their name | **47 of 54** | fixture scan |
| reflected clone shares the skeleton | `true` | `orig.skeleton === clone.skeleton` |
| reflected clone bind mode | `attached` | traverse |
| capture vfov in use | **105.8°** | live |
| capture vfov correct | **86.07°** | `2·atan((H/W)·tan(hfov/2))` |
| canvas aspect / crop aspect | 0.662 / 0.750 | renders neither |
| toast overlaps the view rail | `true`, z 4 over z 3 | `getBoundingClientRect` |
| view chip height | **36 px** | against the 44 px rule |
| `EDITOR_VIEWS` | `CAMERA, FRONT, SIDE, TOP, ISO` | still conflated |
| modules unreachable from `boot.js` | **19 of 91** | import graph walk |
| `ACC-*` ids present in `tests/` | **0 of 12** | grep |

---

## 3. Root causes, in dependency order

### 3.1 The rig never poses — `scene_3d.js:311`

```js
const local = skel.locals[obj.name];
if (!local || obj.isMesh || obj.isSkinnedMesh) return;   // swallows 47 misses per frame
```

`skel.locals` is keyed by raw glTF names. `GLTFLoader` runs every name through `PropertyBinding.sanitizeNodeName`, whose reserved set is `[ ] . : /`. **The dot is stripped.** This is a Blender/FBX export, so 47 of 54 bones carry one: `Arm.R_035`, `Hand.R_037`, `UpLeg.L_02`, `Spine.001_010`, every finger.

Only `root, pelvis, spine_mid, ribcage, neck, head` survive. Head, neck and torso pose correctly and everything from the clavicle outward is welded to the T-pose, which is why it looks intermittently working rather than dead.

Measured divergence in the default state: `elbow_R` off by **0.377 m**, `wrist_R` by **0.580 m**. The solver puts `wrist_R` **22 mm** from the phone and reports grip PASS; the mesh hand is **599 mm** away.

> Note `shoulder_R` shows 0.000 m position error, because its position derives from a drivable parent chain and only its rotation is dead. A registration test that samples joint centres only will pass that joint and miss the failure.

The original v4 spec called this "reconcile GLB root transform and semantic skeleton". The root transform is correct — `Root_01`'s 180° X quaternion, `_rootJoint`, `bodyRoot`'s `root_world` and the Z-up convention are all verified consistent and match the fixture byte for byte. It is string identity in a name lookup. That misdiagnosis is why the blocker survived four revisions.

### 3.2 The reflection is a no-op

`gltfScene.clone(true)` — `SkinnedMesh.copy` does `this.skeleton = source.skeleton`, so the clone shares live bones. In the default `AttachedBindMode`, `updateMatrixWorld` sets `bindMatrixInverse = matrixWorld⁻¹` every frame, and the shader evaluates

```
matrixWorld · matrixWorld⁻¹ · boneMatrix · bindMatrix · v
```

The mesh's own world matrix **cancels**. The Householder matrix on `bodyRefl` never reaches a vertex. The reflected body renders coincident with the direct body at 45% opacity, which is both the empty mirror and the doubled/z-fighting direct body.

The 30-line traverse that copies bone locals into `gltfRefl` and calls `skeleton.update()` is dead work either way — shared skeleton, plus `getObjectByName` per node, per pointermove.

`phoneRefl` is a plain `Mesh`, so the phone reflects correctly. That asymmetry is a useful diagnostic.

### 3.3 Capture parity — `scene_3d.js:222`

```js
cam3.fov = ((camE.hfov || Math.PI/3) * 180) / Math.PI / Math.max(cam3.aspect, 0.2);
```

Degrees divided by aspect is a small-angle approximation, and it uses the **canvas** aspect rather than the crop aspect, and ignores `crop_request` entirely. Measured live: 105.8° against a correct 86.07°.

---

## 4. The three fixes, applied and proven

All in `src/render/scene_3d.js`, currently uncommitted in the working tree.

```js
// 1 — bone lookup. GLTFLoader preserves the original at userData.name (GLTFLoader.js:4278)
const local = skel.locals[(obj.userData && obj.userData.name) || obj.name];

// 2 — after `gltfRefl = gltfScene.clone(true);`
gltfRefl.traverse((o) => {
  if (o.isSkinnedMesh) {
    o.bindMode = "detached";
    o.bindMatrixInverse.copy(o.bindMatrix).invert();
  }
});

// 3 — vertical FOV from the crop aspect
const _h = camE.hfov || Math.PI / 3;
const _ar = 1170 / 1560;
cam3.fov = (2 * Math.atan(Math.tan(_h / 2) / _ar) * 180) / Math.PI;
```

Before/after captures at identical camera and scene:

| view | before | after |
|---|---|---|
| POSE / ISO | figure flat across the lower right, unreadable | standing, framed, arm raised to the phone |
| FRONT | grey slab, black rectangle, hunched shape at the edge | recognisable standing figure |
| TOP | two legs sticking through a wall | usable plan: head, shoulders, arm, phone |
| CAMERA | empty cream, black sliver | subject correctly framed |
| joint selected | magenta disc floating in mid-air | no orphan disc |

The magenta disc in the before column is the head pick sphere at the solved FK position while the mesh was elsewhere, drawn with `depthTest: false`.

**These three are necessary and not sufficient.** The mirror still shows no reflected body: detached bind lets the transform apply, but aperture clipping and the reflected-screen geometry are still missing.

### What the fix exposed

With the mesh in the right place, taps now land on it, the mesh fallback resolves to the generic `body`, falls through every branch in `onDown`, and starts an **orbit drag**. The dock reads "Body". That defect was previously masked by the rig being broken.

---

## 5. Still outstanding

### 5.1 The toast disables a control

Playwright refused a click with:

```
<div class="mp-toast is-on">Moved mirror distance 0.41 → 0.41 m…</div> intercepts pointer events
```

Three separate faults in one element:

1. **It blocks the CAMERA chip.** `.mp-toast` is `left:8 right:8 top:8 z-index:4`; `.mp-views` is at the same origin with `z-index:3`. Not merely obscuring — pointer-blocking.
2. **It fires on a null change.** `solve_network.js:96` builds `compensation` unconditionally inside its branch, and `app_shell.js:286` shows the toast whenever `proj.compensation` is truthy. At boot `from === to === 0.41`, so it announces an override that did not happen.
3. **It is doing §10's job with none of §10's affordances** — no ACCEPT, no RELEASE, no REVERT.

Cheapest useful change in the whole build: gate on `Math.abs(from - to) > tol`, add `pointer-events:none` to the toast, and move it below the view rail.

### 5.2 Phantom joint

`PICK_JOINTS` includes `"spine"`, which is not an FK key — the rig has `spine_lower`/`spine_mid`/`ribcage`. `evaluateSkeleton` confirms: `'spine' in fk === false`. The sphere is created, never positioned, and sits pickable at world origin with radius 0.11 m and `depthTest:false`. Selecting it yields working-looking BEND/TILT/ROTATE chips that silently no-op, because `applyPoseRotations` maps `SEMANTIC["spine"] → undefined → continue`. `requested_state.js:44` also seeds `btt_euler.spine`.

### 5.3 Pick targets

Nine spheres, asymmetric (no `elbow_L`, no `shoulder_L`, no knees, neck or chest), constant 0.11 m radius, `depthTest:false`. At a 1.56 m stature the shoulder→elbow distance is 0.258 m and wrist→elbow 0.237 m, so the spheres along the right arm are contiguous or overlapping. `fixtures/P0/skeleton_map.json` already has all 24 semantic joints and 4 IK chains.

### 5.4 IK

`solveArmIk(fkWorld, locals, chain, target, branch, pole)` and `applyArmIk(...)` both **already accept `pole`**, and it is never supplied — `n = pole || [0,0,1]`. `requested_state.js` has only `ik_branches: {arm_R:1, arm_L:1, leg_R:1, leg_L:1}`, a discrete ±1.

The arm has 7 DOF (shoulder 3, elbow 1, wrist 3). A hand target is 3. The redundancy is exactly a circle traced by the elbow. So `hand target 3 + swivel 1 + wrist orientation 3 = 7` is a complete non-redundant reparameterisation, and elbow-up/elbow-down become swivel 0 and π, retiring the discrete branch. **This is a state field and a control, not new maths.**

`IK_JOINTS` still contains `"head"`.

### 5.5 Reflected phone screen never renders

`phoneRefl = phoneMesh.clone(true)` happens while `screenMesh.geometry` is still the empty initial `BufferGeometry`. On first sync `screenMesh.geometry.dispose()` runs and a new geometry is assigned to the direct mesh only; the clone's child keeps the disposed reference forever.

### 5.6 Undo is breakable

`preview` skips the history push but still mutates `requested`, so it is a commit without an undo entry. `endGesture` is bound to the canvas `onUp` only, never to the inset. `insetPinchHfov` calls `startGesture` per pointermove and no `endGesture`, so a pinch on the inset leaves `gestureOpen = true` and kills history for the rest of the session.

### 5.7 Dead code

19 modules unreachable from `boot.js`, including both byte-identical copies of `contextual_controls.js` and `numeric_entry.js`, all three `src/ui/rooms/*.js`, and all three workers. **`tests/ui.test.mjs` grep-asserts against `src/ui/rooms/scene_room.js`,** which is one of them — deleting dead code will break a test that was only ever testing text.

`solve()` runs synchronously on the main thread on every `pointermove` while `network_solve_worker.js` sits unused.

### 5.8 Diagnostic views

`applyEditor` handles FRONT/SIDE/TOP/orbit only — no BACK, no LEFT/RIGHT — uses a perspective camera at fov 42, and overwrites the orbit target with the pelvis every frame, so FIT BODY / FIT APPARATUS / FIT SELECTION are impossible without restructuring.

---

## 6. Traps

Things that will cost you an hour each.

- **`three.js` name sanitisation.** `[ ] . : /` are stripped from `Object3D.name`. Original survives at `userData.name`. Any future fixture keyed on glTF names has the same exposure.
- **`SkinnedMesh.clone()` shares the skeleton.** It is not a deep copy. If you want independent bones use `SkeletonUtils.clone`, and remember that changes the bind semantics again.
- **`AttachedBindMode` cancels the mesh world matrix.** Any transform you put on a parent group of a skinned mesh does nothing. This is the single most counter-intuitive behaviour in the codebase.
- **Negative-determinant matrices.** three handles winding and normals for mirrored transforms correctly; do not "fix" it.
- **No `node_modules`.** `importmap.json` pins `three@0.170.0` from jsdelivr for the browser. `tests/rig.test.mjs` needs `three` installed as a devDependency or CI cannot run it.
- **A plain `&` background server dies between shell invocations.** Use `setsid ... < /dev/null &`.
- **Headless Chromium needs the swiftshader flags** or you screenshot a blank canvas and conclude the renderer is broken.
- **In SVG, a stylesheet `fill` rule beats a `fill` presentation attribute on the same element.** This silently greyed out 89 coloured labels in the specification documents. Use inline `style="fill:…"`.
- **Green tests prove nothing here.** The suite validates `skeleton_map.json` against `glb_nodes.json` — both raw names, both correct — and never compares either against what `GLTFLoader` actually produces.

---

## 7. Test strategy

`tests/rig.test.mjs` is written and in the tree. Against `c775d79` it gives 3 passes and 2 failures, deliberately:

| | |
|---|---|
| ✅ fixture matches the GLB | 71 nodes, 54 joints, root 5 |
| ✅ every semantic bone resolves by original name | proves the fixtures are sound |
| ✅ resolution by `Object3D.name` alone fails | proves sanitisation is the cause |
| ❌ `scene_3d.js` uses `userData.name` | currently bare `obj.name` |
| ❌ no pick target names a non-existent joint | currently `spine` |

The two passes bracket the two failures, so the failures point at exactly one expression and one array.

Missing and worth writing next, in order:

```
ACC-REG-01   rendered bone position vs solver FK, all joints      < 5 mm
ACC-CAM-01   preview vs export projection of one landmark         < 2 px in 1170
ACC-REF-01   reflected skinned meshes use detached bind           asserted
ACC-REF-02   rendered aperture boundary vs finiteApertureTest     versioned tolerance
ACC-TXN-01   one undoable transaction per gesture                 history depth == gesture count
```

Add a screenshot set as a human gate: POSE/ISO default, POSE with a joint selected, SCENE, capture-prominent. Every defect in §5 is visible in under a second in one of those four frames, and none of them is visible to the current suite.

---

## 8. Build order

| phase | work | gate |
|---|---|---|
| 0 | `BoneIndex` class with a boot assertion; land `rig.test.mjs`; add `three` devDependency; commit the screenshot set | rig test fails on baseline for the right reason |
| 1 | commit fix 1; drop phantom `spine`; expand `PICK_JOINTS` to 24 symmetric, radius from bone length, `depthTest:true` | knee, left wrist and head all move the mesh |
| 2 | commit fix 2; aperture clipping; reflected screen geometry | reflection inside the mirror, direct body no longer doubled |
| 3 | commit fix 3; render at crop aspect; editor layer off the capture camera | ACC-CAM-01 under 2 px |
| 4 | toast: gate on delta, `pointer-events:none`, reposition | CAMERA chip clickable without `force` |
| 5 | split `main_pane` from `editor_view`; six views; framing policy | inset swap preserves the view |
| 6 | transaction cards; occlusion intent; feasible panel | compensation never arrives as a toast |
| 7 | screen quad with four-corner dragger; P/Q separation | quad survives off-axis rotation |
| 8 | mask render mode; per-part IoU; A–I extraction into fixtures | nine panels plot on the feasible map |

Phases 1–3 are the whole of P0 and are perhaps a week. **Do not reorder.** Judging docks, framing or composition against a rest-pose mannequin in an empty mirror is how v2, v3 and v4 each ended up re-listing the same nine blockers.

---

## 9. Aperture clipping, recommended approach

Do not use stencil. Build the clip volume from the camera position through the four aperture corners — four planes — plus a fifth at the mirror plane, and apply via `material.clippingPlanes` with `renderer.localClippingEnabled = true`.

Reasons: three r170 defaults `stencil: false`; the inset currently renders by resizing the shared renderer and `drawImage`-ing it, which makes stencil state fragile; and the fifth plane is the step the v4 five-step stencil recipe omitted, without which geometry behind the mirror appears inside it.

`finiteApertureTest` already computes exact per-point aperture membership analytically. Assert the rendered boundary against it rather than reimplementing.

---

## 10. Numbers you will need

Working configuration back-solved from `landmarks.json` (mirror occupancy 0.238):

```
m 1.200   face to mirror            R      7.46 ×
u 0.340   camera forward of face    σ      19.45°
c 1.540   camera to mirror          clear  1.24°  (marginal, hair-inclusive r = 0.115)
e 0.140   perpendicular offset      hfov   70° · HYPOTHESIS, unmeasured
a 0.368   arm extension             crop   1170 × 1560
```

Closed forms worth having to hand:

```
z_r            = (p·z_c + c·z_p) / (c + p)          reflection height on the mirror
aperture height = stature · c/(c + p)                = 0.955 m here
sill            = p·z_c / (c + p)                    = 0.729 m here
sill sensitivity = p/(c + p)                         = 0.44 m per m of camera height
vfov            = 2·atan((H/W)·tan(hfov/2))
side-offset rule = e/r > 1 + a/2m                    eclipse boundary at m ≈ 1.25a
recursion scale  = W_s / (4c·tan(hfov/2))            ≈ 0.016 at 70°, so level 3 does not exist
```

**R is calibration-independent** — it is a ratio of image sizes, so focal length cancels. Every absolute distance inherits the full HFOV error: at 80° instead of 70°, `a` +18%, `c` +20%, `m` +22%, `R` 0%. Recording one measured phone width and a device HFOV closes four of the five open disagreements in the spec.

---

## 11. Reference material in the repo

- `Mirror_Portrait_UI_Spec_v5.html` — argued specification, geometry derivations, reconciliation notes, open disagreements
- `Mirror_Portrait_Requirements_v5.html` — 67 requirements (57 dynamics carried forward, 10 geometry, marked G), each with driver, preserved relations, wanted outcome and named failure mode
- `Mirror_Portrait_Combined_UI_Specification_v2_Self_Contained.html` — the 57-dynamic catalogue with source page references
- `fixtures/P0/` — `skeleton_map.json` (24 joints, 4 IK chains), `glb_nodes.json`, `landmarks.json`, `tolerances.js`

The A–I reference sheet extraction produced measured occupancies per panel; the script also emits centroids, bounding boxes and medial axes, which closes the `hip_L/R` and `phone.screen_quad` gaps the fixture notes admit.

---

## 12. First hour

1. `setsid python3 -m http.server 8777 --bind 127.0.0.1 &` and open the local URL.
2. `git diff src/render/scene_3d.js` — read the three fixes.
3. Revert them, screenshot POSE/ISO. Re-apply, screenshot again. That comparison is the fastest way to internalise what is broken.
4. `node --test tests/rig.test.mjs` after `npm i -D three@0.170.0`. Watch it fail on exactly two assertions.
5. Fix those two. Commit. That is Phase 1.
