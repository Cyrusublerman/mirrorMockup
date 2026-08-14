---
name: 100% spec parity build
overview: Close every UI-01..UI-24, Governing Spec §25/§27, and audit L/D/S/I finding with that document’s own fix. No invented physics. No Mega extras. No production mirror rotation. S-01 resolved only as declared off-centre final crop.
todos:
  - id: p0-freeze
    content: Freeze fixtures/tolerances, six-mode DRIVER/PRESERVE/ALLOWED table, default overlay set, P0 schema (bbox_centre, parity, missing hips/screen/head-bbox). No new ε.
    status: pending
  - id: s01-crop
    content: S-01(b) crop reachability. Capture principal stays W/2,H/2. Derive crop so final frame places reflected phone at P0 (0.727,0.111). Failing then green §25.3 test.
    status: pending
  - id: mirror-rp
    content: S-02 WORLD|APPARATUS mirror authority; store WORLD pose; (d_M,p_u,p_v) derived. S-03 R_P vs capture frame; crop non-triggering.
    status: pending
  - id: constraint-net
    content: Simultaneous network; x_decision/dependent/locked; executable masks; root-solve d_M; SET_TARGET_WEIGHT; solver metadata; proposal-undo parent; AUTO third branch; min_carrier_px; p_log/p_fix; output_repeat.
    status: pending
  - id: pose-pans
    content: Joint-specific BTT; swivel IK; LOCK_GRIP real; RELAX GRIP proposal; PAN_REFLECTED_CONTENT image-space through allowed vars; four pans visually distinct; endpoint orientation vs position.
    status: pending
  - id: visual-truth
    content: Distinct RIGGED/STICK/SIMPLE/SILHOUETTE; virtual-camera reflection; post-crop overlay catalogue; lock chips; opacity in Pose/Scene; certificate EXACT/APPROX/PROJECTIVE/NON-CLOSING/FOLD-RISK; Q five size bases.
    status: pending
  - id: recursion-gpu
    content: Finite portal bound to P; GPU samples kernel.js; CPU/GPU parity; no second editable P; refuse/degrade with reason.
    status: pending
  - id: export-ui
    content: Four export products; A–E vs pose/workspace/scene snapshots; four-zone desktop; a11y; L-05 importmap from repo; pin SHA; UI-01..24 + one test per audit ID.
    status: pending
isProject: true
---

# 100% spec parity — no deviation

Done iff the conjunction holds: UI Authority v1 **UI-01..UI-24** on the viewport matrix; Governing Spec v1 **§25 and §27.1–27.19**; Consolidated Audit v1 every **L/D/S** closed by **that finding’s stated fix**; implementation-audit **I-01..I-16** closed by the same physics. Visual polish cannot waive math. Math cannot waive UI.

Baseline: `origin/main` `338b6b4` (PR #5 AppShell). Keep AppShell; do not restyle `debug.html`.

## 0 Authorities (UI §1). Later does not override earlier except USER.

1. Architecture / action / selector contracts — UI never owns physical truth; no UI import of `shared_math` or `domains` (`validate.py`).
2. Painting Guide Rig Interface Spec v2 — target-led workbench.
3. Mathematical Composition UI/UX v3 — selection, overlays, HUD, portal-first recursion.
4. Pose Manipulation spec — hybrid FK/IK, pointer arbitration, viewport split.
5. Governing Spec v1 — simultaneous constraint network; phone-camera rigid; `n_M = −f_C`; no duplicate DOF; P physical / Q authored; AUTO from valid P.
6. Consolidated Audit v1 — defects and security.
7. **USER (wins where stated):** no production `ROTATE_MIRROR`; no Mega domains in this app UI; debug harness is not the product.

Mega Build (panel-space, correspondence morph, contradiction catalogue, water/hair/paint theory, `physical_limits.js` DoF/ghost/beat, Mirror Rig / Loop Lab split): **out**.

Kernel α, γ, λ₁, axial λ/H_vis, elbow 132.95°: **verified correct. Do not re-derive.**

## 1 Frozen conflict resolutions

| Conflict | Resolution | Forbidden |
|---|---|---|
| S-01 parallel lock vs P0 phone (0.727, 0.111) | **(b) declared off-centre final crop.** Derive crop so **final** frame matches P0. Capture `cx,cy` stay `W/2,H/2`. Window pan does not translate reflected content. | (a) bounded tilt. (c) “P0 unreachable”. Production mirror rotation. Mutating principal point. |
| S-02 mirror parent | `mirror_frame_authority: WORLD \| APPARATUS`. Store WORLD pose. `(d_M,p_u,p_v)` derived readouts. Default WORLD for wall-mirror P0. | Apparatus-only world pose with no WORLD store. |
| S-03 crop vs R_P | **R_P defined on capture frame.** Final crop is non-triggering for R_P / d_M / P / recursion. State this exclusion in target metadata. | Crop edit that moves d_M. |
| S-06 L/R vs saved-image | Add `saved_image_mirrored: true \| false \| UNDECLARED`. Do not infer anatomical side from screen x. Until evidence, L/R labels `INCONSISTENT_PENDING_PARITY`; solver keys geometric IDs. | Guessing EXIF. Relabelling without evidence. |
| S-07 centroid | Rename fixture field `bbox_centre`. Area-weighted centroid is a **separate** metric if §12.3 stands. | Labelling bbox centre “centroid”. |
| S-08/S-09/S-13 missing digits | Schema: `hip_L/R`, reflected head bbox, screen_quad (semantic corner order), aperture margins. Values from **published construction / private re-digitise only**. Until then `status: missing`; tests must not invent coordinates. Elbow 132.95 remains the only reproduced angle. | Invented hips, fake screen quad, asserting 178° knees from pelvis. |
| S-14 valid P ≠ exact loop | AUTO third branch: **EXACT \| DEGRADED (named anisotropy) \| REFUSED (reason)**. Certificate chips match. | Fake continuity. |
| S-15 carrier vs depth | First-class `min_carrier_px(N)`. Conflict with P0 profile named, neither dropped: status **PROJECTED** with named conflict. Binding for §27: both reported; AUTO may DEGRADE, not silently drop. | Dropping either requirement. |
| S-16 | `p_log` vs `p_fix`. Coincidence condition stated; they are not identified by default. | One symbol `p`. |
| I-08 reflected pan | Image-space target through **allowed** vars (pose, phone per authority, d_M, crop). Preserve locks. | Direct body-root x/z translation as the meaning of the action. |
| I-09 / UI-10 outer pan | `crop_pan` only. | Writing `cx,cy`. |
| I-10 d_M | Root-solve reflected-phone-area residual to named tolerance. | Gain-0.5 one-shot clamp. |
| Product UI | AppShell POSE\|SCENE\|RECURSION. Inspect drawer. Composition overlay layer. | Five-mode nav as product. Restyling debug into production. |

## 2 Invention ban

If a number is not in Governing Spec, UI Authority, Audit, published kernel, or a **committed residual baseline recorded after S-01(b)**, it is not a gate. Do not introduce new ε, new modes, new overlay families, or new export products.

## 3 Normative tables (Phase 1, unblocks S-19/S-20/S-24/S-25)

File: `fixtures/tolerances.js` (and `.json` if validate requires). Versioned. Referenced by ID.

### 3.1 Numbers that already exist (freeze; do not replace)

| ID | Quantity | Value | Source |
|---|---|---|---|
| T-LANDMARK | IMAGE_NORM quantum | 0.0005 | 3 dp landmarks; S-12 |
| T-ELBOW | elbow image angle | 132.95° to 2 dp | audit verified |
| T-HOMO | homography ill-conditioned | `condition > 1e8` | existing `carrier_p` (only coded P-gate number; S-17 freeze) |
| T-CR | Cauchy–Riemann | 5.5e-11 | verified kernel notes |
| T-DETJ | fold | `det J > 0` | kernel |
| T-GABS | \|γ\| | 22.5836845286 | published |
| T-GARG | arg γ | 157.6255960832° | published |
| T-S | S | 256 | kernel fixture |
| T-MOCC | P0 mirror occupancy | 0.485×0.490 = 0.23765 ≈ 23.8% | S-04 |
| T-HOCC | direct head occupancy | 22.5% | S-04 |
| T-BOCC | reflected body occupancy | 6.8% | S-04 |
| T-POCC | phone occupancy | 0.16% | S-04 |
| T-CW | P0 phone body width | 0.034 frame | S-15 |
| T-ANK | ankle–aperture clearance | 0.020 frame; 4.1% mirror height; body fills 83.7% mirror height | S-10 |
| T-LEG | legible_px | 12 | S-15 worked example |
| T-AMOD | \|a\| in that example | 0.5 | S-15 |
| T-PHONE | P0 phone bbox_centre | (0.727, 0.111) fixture (0.727, 0.1115) | §1.1 / landmarks.js |
| T-MIR | P0 mirror bbox_centre | (0.673, 0.300) fixture (0.6725, 0.3) | §1.1 |
| T-AXIAL | §25.4 agreement fixture | axial; aperture centred; p_u=p_v=0; no final crop; pinhole; zero distortion; principal at centre | S-05 |

`p0Targets` hard-coded `tolerance: 0.04` is **not** spec. Replace with T-LANDMARK for points; bbox residual uses the box metric in the same quantum. S-24: after S-01(b), run P0_RECONSTRUCT once, commit `fixtures/P0/residual_baseline.js`. ε_i = T-LANDMARK (the only documented IMAGE_NORM quantum). The test fails when `|residual_i − baseline_i| > ε_i`. Absolute magnitude of baseline is recorded, not required to be zero.

S-17 remaining words (“footprint”, “facing”): footprint = `min_carrier_px(N)` from S-15 formula `legible_px / |a|^(N-1)` with T-LEG and the scene’s \|a\|; facing = existing `depth > 0` plus winding/convex already in `evaluateCarrierP`. No new facing-angle constant.

### 3.2 Six-mode table (S-19). Six rows, three columns. No seventh mode.

Construction rule: DRIVER = the mode’s named job. PRESERVE = production locks ∪ invariants that section already names for that job. ALLOWED = variables that job requires that are not PRESERVE and not forbidden. Forbidden in production ALLOWED: mirror orientation; `cx,cy`; `p_u,p_v` as reflected-content translator.

Production locks (always PRESERVE unless MANUAL + Inspect unlock): `apparatus_rotation` (`n_M=−f_C`); `camera_rigid_to_phone`; link lengths; support if pinned; grip if `LOCK_GRIP`; R_P if ratio chip on (then d_M is ALLOWED, not the ratio).

| Mode | DRIVER | PRESERVE | ALLOWED_TO_MOVE |
|---|---|---|---|
| POSE_FIRST | selected pose (FK/IK) | production locks, FOV, R_P if locked | selected-chain pose DOFs; multi-effector only when several constraints need it |
| PHONE_FIRST | phone pose | production locks; R_P if locked | phone; arm/grip per authority; d_M if R_P preserved |
| MIRROR_RATIO_FIRST | preserved R_P (capture-frame) | production locks, FOV unless FOV is the gesture | d_M along n_M, **root-solved** |
| COMPOSITION_FIT | active image-space targets | production locks | pose, phone per authority, d_M, **crop_pan (S-01b)**. Not mirror window pan. |
| P0_RECONSTRUCT | P0 fixture targets | production locks, declared crop aspect/orientation | pose, phone, d_M, crop offset that realises (b) |
| MANUAL | current gesture object | only artist lock-chips | unlocked `x_decision` of that object |

`applySolveMode` must **enforce** this triple in the optimiser, not store unused arrays. `COMPOSITION_FIT` must stop using `mirror_pan` as a phone-centroid nudge.

### 3.3 Default overlays (S-25) + precedence (UI §13)

Default = **selection-driven**. Artist does not manage ten global checkboxes while posing. Inspect exposes the full catalogue.

| Context | Default on |
|---|---|
| requested ≠ effective | requested ghost + residual vector + limiting constraint |
| any selection | that object’s manipulator only |
| POSE + body | skeleton/reach/support in 3D; not GRID |
| SCENE + phone | PHONE, CAMERA, APPARATUS |
| SCENE + mirror | MIRROR aperture, hits, VISIBILITY |
| RECURSION or P valid | derived P outline (non-editable in AUTO), certificate badge |
| RECURSION + Q selected | Q manipulator; q/n chips |
| Inspect toggles | GRID (0-1 / pixel / thirds / custom rational), BBOX, CENTROID (true) + bbox_centre (named), MEASURE, PERSPECTIVE (frustum from capture+crop), CORRESPONDENCE, DISTORTION |

Stack order (never invert): scene/reflection → private reference → silhouettes → P + aperture → ghosts/residuals → manipulator → measurements → recursion certificate → Inspect-only.

### 3.4 P0 fixture schema (no new observations)

Keep published landmarks. Rename `centroid` → `bbox_centre` where equal to bbox centre (S-07, verified 4 dp). Add fields with `status: missing` until private digitise: `hip_L`, `hip_R`, `reflected_head.bbox`, `phone.screen_quad` (semantic order), `aperture_margin` per required landmark, `saved_image_mirrored`, `coordinate_space: IMAGE_NORM` **and** `y_down: true` on the record (S-11). `epistemic_status` per point: OBSERVED / INFERRED / CALIBRATED / HYPOTHETICAL. Do not commit P0 photograph (D-01). CI rejects image blobs under `fixtures/P0/`.

## 4 Current ≠ required (honest)

Already structurally present, **not** DoD: AppShell rooms; one WebGL + 2D blit inset; four pan **actions**; crop_pan vs principal; overlay **names**; Inspect DRIVER/PRESERVE display; AUTO refuse on invalid P; pin SHA; allowlist `?repo=`; no `<base>`; textContent errors; 64 solver tests.

Must still become true:

- SIMPLE ≡ STICK today (`scene_3d.js`). Four representations, one pose state.
- Lock chips `PHONE AREA`, `REFLECTED BODY SCALE`, `MIRROR OCCUPANCY`, `SUPPORT`, `GRIP`, `P VALID` absent.
- Opacity HUD absent (`setOpacity` exists unused).
- PERSPECTIVE is a fake vanishing diagram.
- UI-13 residuals are capture IMAGE_NORM, not **after final crop**.
- LOCK_GRIP is a chip; pose solver ignores it. RELAX GRIP proposal absent.
- `PAN_REFLECTED_CONTENT` translates body root (I-08 open).
- d_M is heuristic (I-10). Sequential `solveOnce` not a simultaneous network (I-01).
- Certificate badge shows APP/UI/CORE, not EXACT/APPROX/PROJECTIVE/NON-CLOSING/FOLD-RISK.
- Q size bases: contain/cover only; missing Width%/Height%/Area%.
- Snapshots A/B/C whole-state only; not POSE PRESET / WORKSPACE / SCENE / A–E.
- Export one `EXPORT_IMAGE` dump, not S-26 four products.
- GPU path stub (I-14). Recursion not bound to P as finite portal (I-13).
- Overlay MEASURE is stature text, not distances/angles/clearances.
- Ghost layer is a caption, not requested/effective endpoints (UI-05).
- Four-zone desktop incomplete. Device matrix UI-01..24 never run.
- L-05 importmap still hardcoded three@0.170.0.
- CSP still `'unsafe-inline'`.

## 5 Build sequence (audit §6 order is mandatory)

Pause overlay polish that chases unreachable P0 until Phase 1 crop exists.

### Phase 0 remainder (loader)

L-05: fetch `importmap.json` from the **pinned** repo before first app module. L-08: tighten CSP if the shim still boots without `'unsafe-inline'`; if it cannot, document the residual as the minimum needed for the shim IIFE and nothing else. L-01..L-04, L-06, L-07, L-09..L-12, D-01: keep current closures; do not regress. Never `@main`. After every content commit: pin SHA in `remote.html` + `BUILD.commit`, then a tiny pin commit.

### Phase 1 — P0 reachability

1. Implement crop as post-projection framing. `PAN_OUTER_FRAME` / `SET_FINAL_CROP` write `crop_pan` + aspect only.
2. **Reachability probe (audit §7):** with `n_M=−f_C`, compute crop offset that places reflected phone at P0 in the **final** frame while capture principal stays centred. Record magnitude. Check against §24.1 aspect/orientation (portrait P0). If aspect forbids the offset, crop+aspect become a named PROJECTED with the recorded numbers — still not tilt, still not “unreachable”.
3. Default P0_RECONSTRUCT applies that crop. Test: failing until residual(phone in **final** crop frame) is within T-LANDMARK of (0.727, 0.111); then green.
4. Fixture schema §3.4. Knee test: **must not** require 178° until hips exist; **must** still reproduce elbow 132.95°.

### Phase 2 — constraint network (I-01, S-19..S-22, S-28)

`x_decision` / `x_dependent` / `x_locked` partition. Objective over `x_decision` only. Hard equalities/inequalities + soft objectives. Masks executable. Every transaction reports requested / effective / residual / moved variables / limiting constraint / compensation sentence.

Actions to **add** (extend contract, do not invent UI-only mutation): `SET_TARGET_WEIGHT` + `weight_origin` on target metadata (S-22); Inspect shows the weight vector.

`ConstraintResult`: `solver_id`, `solver_version`, `seed`, `iterations`, `converged`, `fd_step`, `tolerance_set_hash` (S-21). Same values in export sidecar.

Proposals: child of originating undo transaction, **or** independent transactions that **block undo of parent** until rejected (S-23). Pick the first (child) — it matches “one drag = one undo” when the proposal is declined, and keeps accept inside the drag’s family.

`SET_MIRROR_DISTANCE` autosolve: iterate until R_P residual ≤ table, or PROJECTED at d_M bounds 0.25..8 m (those bounds already exist; freeze as T-DM-BOUNDS from code, labelled CODE_PRESENT not spec-derived).

### Phase 3 — posing and pans (I-02, I-06, I-07, I-08, I-11, I-12)

- Semantic Bend/Tilt/Rotate; anatomical L/R follows figure.
- Joint-specific BTT limits; unknown limits labelled unknown (UI §7.1). No global quaternion cap as if biological truth.
- Arm IK: shoulder origin; pole/swivel; previous-branch continuity. Foot: hip origin. Endpoint **orientation separable from position**.
- Ghost + residual + limiting constraint; no link stretch (UI-05).
- Authority: PHONE_DRIVES_HAND, HAND_DRIVES_PHONE, **LOCK_GRIP** (incompatible request → PROJECTED/FAIL, grip unchanged), **RELAX GRIP** as proposal only.
- Support explicit; floor contact ≠ valid support.
- Visibility: not a two-triangle pelvis/shoulder/head proxy. Direct/reflected runs, clipping, hand/screen occlusion as UI §9.2 VISIBILITY. Silhouette from SIMPLE/SILHOUETTE representation.
- Camera: rigid `T_WC = T_WP T_PC`; local extra rotation remains identity unless calibration says otherwise; **no capture `lookAt()`**. Distortion participates only if calibration supplies coefficients; else zero and labelled uncalibrated (I-11). HFOV is a network variable with sensitivity.
- Four pans: each action, each visible effect, no shared gesture without cue.

### Phase 4 — visual truth (I-03, I-04, I-05, UI-11, UI-12)

- Mirror shows **virtual-camera** reflected subject + phone (planar reflection of capture camera). Grey slab fails. Point-reflecting a mesh origin is not sufficient if the mannequin is not the reflected image.
- RIGGED / STICK / SIMPLE / SILHOUETTE: four draws, **one** pose state; switching never forks.
- Private reference from local/private store; opacity control in Pose/Scene HUD; views: source-only, landmark-only, silhouette-only, mirror/phone-only, residual.
- Overlays from **post-crop** coordinates when they describe final composition (UI §13.1).
- PERSPECTIVE = capture frustum + crop rectangle + projected phone/mirror, not a decorative X.
- Lock chips named as relationships. Select chip → target, tolerance, owner vars, solvers.
- Compensation toast: e.g. “mirror distance +34 mm to preserve reflected screen area” (UI-14). Units named.
- Tokens frozen (UI §4): canvas `#F7F5EF`, magenta `#D82D84`, blue `#395BD6`, ink `#181818`/`#606060`, ok/warn/error `#2E7D4A`/`#A66800`/`#B53A3A`. System sans. 100dvh, no page scroll. Stage min 64dvh; HUD max 26dvh; portrait viz 60–70%. Touch 44px. One WebGLRenderer.

### Phase 5 — finite Print Gallery (I-13, I-14, S-14, S-15, S-17, S-18)

P = four reflected **physical screen** corners + homography (keep). AUTO attaches to P; **no second editable P**. Q spatial; size basis ∈ {Width%, Height%, Area%, Contain, Cover}; changing Q cannot resize the screen.

If P invalid: disable AUTO; reason ∈ {clipped, behind camera, occluded, degenerate, outside aperture, ill-conditioned, finite-portal unavailable}. Keep diagnostic outline.

If P valid and exact loop impossible: DEGRADED or REFUSED with reason (S-14). Distortion overlay Inspect-only.

State: `source_period` and **`output_repeat`** (`|γ|`) both stored and shown (S-18). S/alpha/coefficients Inspect-only.

GPU: production sampling uses `domains/recursion/kernel.js` as sole truth (S-27). Parity test vs CPU within T-CR / existing §20.4 once that row exists in the tolerance file — if §20.4 never states a number, freeze parity to bit-identical UV on a committed sample set from the kernel fixture, not a new ε.

`min_carrier_px(N)` target; P0 conflict → PROJECTED named.

### Phase 6 — export, snapshots, a11y, UI remainder

**Exports (S-26, UI §19, UI-24)** as separate actions:

1. `EXPORT_FINAL_CAMERA` — physical scene raster (mannequin + mirror + reflection + phone), chosen resolution, **not** abstract recursion field.
2. `EXPORT_STAGING_PRESCRIPTION` — distances, FOV, support, critical tolerances, build SHA.
3. `EXPORT_COMPOSITION_OVERLAY` — crop, grids, bboxes, landmarks, P, ratios, residuals.
4. `EXPORT_REFERENCE_RENDER` — P/Q/fixed point/certificate if enabled.

JSON sidecar with calibration + `BUILD` (APP/UI/CORE + commit). UI distinguishes private-image inclusion vs guide-only. Optional canvas-mm only if canvas dimensions are known.

**Snapshots (UI §16.1)** four types: POSE PRESET (no scene optics); WORKSPACE (viewport/selection/opacity, no pose truth); SCENE SNAPSHOT (pose+apparatus+targets); A–E VARIANT (whole requested+targets, no drag transients). History: one drag = one labelled undo; preview does not flood; undo restores requested and recomputes effective.

**Desktop:** four-zone workbench (UI Fig 2). Collapse never mutates scene. **360px:** one-row strip, no page scroll (UI-01). **UI-20:** no wrapped five-mode pills, no debug text over scene, no scrolling numeric form.

**Precision:** transient sheet; one commit; scene stays on screen (UI-18).

**A11y (UI-23, §17):** keyboard + HUD equivalents; colour not sole signal; 44px; focus rings; units in accessible text; `prefers-reduced-motion` → instant ghosts; commit announcements not per-frame.

**L-05** then pin.

## 6 UI-01..UI-24 → required behaviour (no paraphrase drift)

| ID | Must be true |
|---|---|
| UI-01 | 360px CSS: POSE\|SCENE\|RECURSION one row; no page vertical scroll |
| UI-02 | Primary viz ≥ 60% portrait working height |
| UI-03 | Rigged GLB visible, framed, selectable on Pose load |
| UI-04 | Hand drag: IK; editor does not orbit (pointer capture) |
| UI-05 | Unreachable: requested ghost, effective endpoint, residual, limiting constraint; no stretch |
| UI-06 | Joint: only semantic controls; no permanent XYZ/Euler form |
| UI-07 | FRONT/SIDE/TOP/ISO on stage; capture in inset; tap swaps |
| UI-08 | Phone move recomputes camera, arm/grip, reflection, P; UI owns no geometry |
| UI-09 | d_M preserves rotational lock; no yaw/pitch/roll in normal UI |
| UI-10 | Four pans, four actions, four visible effects |
| UI-11 | Private reference + opacity; no public photo |
| UI-12 | Ten overlay families render **real** post-crop data |
| UI-13 | Target class/tolerance; residuals **after final crop** |
| UI-14 | Compensation names moved variable + preserved relation |
| UI-15 | P from reflected screen; AUTO has no second editable P |
| UI-16 | Invalid P: refuse with reason; no fake continuity |
| UI-17 | Q spatial; q/n compact; S/alpha Inspect-only |
| UI-18 | Precision transient; does not displace view |
| UI-19 | One drag, one undo, semantic label |
| UI-20 | Debug-harness screenshot unreachable in production states |
| UI-21 | Inspect/export APP/UI/CORE + commit |
| UI-22 | No P0 image in public fixtures |
| UI-23 | Keyboard/touch; colour not sole status |
| UI-24 | Export is scene + staging + overlay + provenance, not recursion-only raster |

Viewport matrix: 360px portrait, landscape phone/tablet, desktop four-zone. This VM’s headless WebGL may fail; **layout/contract tests in Node are required**; **device visual matrix is a human gate**, not skipped as “done”.

## 7 Audit ID closure (each finding’s own fix)

**Loader:** L-01 allowlist; L-02 textContent; L-03 pin SHA; L-04 no `<base>`; L-05 importmap from repo; L-06 boot.js; L-07 distinct load vs boot errors; L-08 CSP; L-09 onerror/unhandledrejection; L-10 stamp in Inspect/export; L-11 touch-action/overscroll; L-12 `new URL`. **D-01** CI image ban.

**Spec:** S-01(b); S-02 WORLD store; S-03 capture-frame R_P; S-04 occupancy numbers in fixture comments (prose “half frame” never used as seed); S-05 axial fixture; S-06 parity field; S-07 rename; S-08–S-10 schema + missing until digitise; S-11 y_down on record; S-12 angles not over-precise in UI (1°); S-13 hips or restated construction; S-14 third branch; S-15 min_carrier_px; S-16 p_log/p_fix; S-17 quantified by §3.1; S-18 output_repeat; S-19 table §3.2; S-20 table §3.1; S-21 metadata; S-22 SET_TARGET_WEIGHT; S-23 proposal parent; S-24 baseline file; S-25 §3.3; S-26 four exports; S-27 shared kernel; S-28 partition.

**Implementation (preserve kernel; fix these):** I-01 simultaneous net; I-02 real region metrics; I-03 private reference; I-04 virtual-camera reflection; I-05 overlay stack; I-06 direct manipulation; I-07 joint limits + swivel; I-08 reflected pan semantics; I-09 crop ≠ principal; I-10 root-solve d_M; I-11 calibration completeness as labelled; I-12 visibility; I-13 finite portal; I-14 GPU; I-15 physical export; I-16 tests that can fail on optical drift.

## 8 Tests (must be able to fail)

- One Node test per UI-01..UI-24 that is DOM-expressible (rooms, actions, crop vs cx, overlay data, export keys, undo, P non-editable, lock chip ids, four representations, snapshot types, weight action, solver metadata).
- Device checklist file is **not** a second markdown in repo root. Put the matrix in `tests/ui_device_matrix.json` (data, not prose).
- One test per audit ID (assert the fix, not the ID string).
- P0 residual vs baseline (S-24).
- Crop-reachability (S-01).
- WORLD mirror: moving phone does not translate WORLD mirror unless APPARATUS authority (S-02).
- Crop does not change R_P (S-03).
- AUTO third branch (S-14).
- Elbow 132.95; knees not falsely certified.
- Kernel |γ|/arg vs PUBLISHED.
- `validate.py` still bans Mega paths and UI→domains/shared_math.
- No `ROTATE_MIRROR` in production action HUD.

Do not add tests the user did not require **except** these spec/audit-required ones.

## 9 Module invariant

Keep §26 tree. UI: `app_shell` + rooms/viewport/manipulators/overlays/hud/state/adapters. Facade: `dispatch(name, payload, { preview, label })`, `beginUndoGroup`, `getRequested`, `getEffective`. No `app.state`. Three.js identity is not project state.

## 10 Stop conditions / non-goals

Stop when §0 Done conjunction is true. Do not: restyle debug; add production mirror rotation; `@main`; commit P0 photo; Mega extras; second kernel; sequential-solver “good enough”; skip device matrix by claiming UI-01..24 pass; invent hips/screen/ε; treat SIMPLE as STICK; treat lock chips as labels without policy; treat EXPORT_IMAGE as S-26.

## 11 Implementer rule

Where this plan and a convenience conflict, this plan wins. Where this plan and USER “no production mirror rotation” would conflict with reaching P0, **crop (b) wins**. Where a field cannot be observed, mark `missing` and fail closed rather than fabricate.
