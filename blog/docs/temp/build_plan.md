---
title: mirrorMockup build plan
object_type: execution_plan
status: proposed
date: 2026-08-13
authority: Mega Build Authority 13 Aug 2026 (Parts I–IV) + source release v1.4 HANDOVER
repo_state: LICENSE only (CC0). No src, tests, or dist.
---

# 0. Object and constraints

**Product.** One artist-facing composition system: ordinary bathroom/mirror-selfie first, certified Print Gallery recursion and declared contradiction later. Final authority is a 2D camera-frame image. 3D exists only to make that 2D coherent.

**Repo now.** `Cyrusublerman/mirrorMockup` contains `LICENSE` (CC0 1.0). Library path `03_PROJECTS/Art/print_gallery_mirror_portrait/` is not fetchable from this environment (404). v1.4 modular source is therefore reconstructed from Mega Build Parts II–III plus HANDOVER module inventory, not copied from an existing tree.

**Locked decisions (do not reopen).**

1. Periodicity route = **author Q periodic, composite into P** (HANDOVER §3 route 3). Paste and retouch are rejected as production paths.
2. P (physical carrier) and Q (recursive content) meet only at a versioned `integration/` handoff. No shared scene model.
3. Transaction vocabulary in product code: `PASS | PROJECTED | FAIL`. Map v1.4 `SATISFIED → PASS`, `MODIFIED → PROJECTED`, `INFEASIBLE → FAIL`. Requested state is never silently overwritten.
4. Part I governs review and intent records. It cannot override physical or mathematical truth. No affect/erotic/misaddress scalars.
5. Standalone HTML is generated output. Modular `src/` is implementation authority. `dist/` is never hand-edited.
6. Do not add a twelfth ad-hoc tool. Existing v1.4 tool set (`validate.py`, `build_all.py`, per-app tests, `reference/verify.py`) is the validation surface; extend it, do not replace it.

**Human-only blockers (software cannot close).** Shoot a real plate; measure `S_scr`, `d_cam`, mirror distance, `hfov`; bracket `M`. Device calibration residuals. Ordinary-read / misaddress / gallery-scale reviews. Private address fields.

**Staging fact to encode, not “fix”.** Stock poses fail `depth_of_field` and related capture gates. Near subject ≥ 0.70 m or stacked exposure. Hyperfocal 1.107 m; 0.70–2.80 m closes; 0.30–2.80 m does not.

# 1. Authority map

Precedence: Part III sharpens overlapping Part II; Part I constrains product behaviour without changing solvers; Part IV is the only `Axx`/`Sxx` key.

| ID | Role in this repo |
|---|---|
| S22, A01, A02, S19, S04, A05 | identity, laws, ordinary-first, composition hierarchy |
| S07, S08, S05, S06 | facade, shared state, versioning, APP v1 gates |
| S01, S02, S03 | workbench, metrics/control, UI interaction |
| S09–S16 | optics, calibration, pose evidence, support, hand, visibility, P carrier |
| S17, S18 | frozen kernel and panel-space fixtures |
| S20, S21 | orthogonal metadata; promotion TODO |
| E01–E20 | contextual fact-check only; never solver targets |

Non-negotiable separations (Part II §0.2): requested≠effective; world≠image; skeleton≠visible mass; anatomical L/R ≠ display L/R; wrist/hand/grip/phone/screen/optical-centre; aperture≠reflected scale; HFOV≠source period S; **P≠Q**; L0≠L1≠L2; O ≠ p_T ≠ p_W; recursive_depth ≠ temporal_index; exact loop ≠ optional warp; panel topology ≠ transform ≠ connector ≠ route; valid base ≠ declared contradiction; hard feasibility ≠ soft preference.

# 2. Target source layout

Match Part II §3. ES modules. Maths free of Three.js/WebGL types.

```
src/
  app/          bootstrap, facade, actions, selectors, project_io
  scene/        requested, effective, orchestrator, solve_policy, history, proposals, dependency_graph
  domains/      pose body support hand_grip phone camera mirror reflection
                visibility constraints composition reference_alignment
                carrier_p canonical_content recursion domain_warp
                panel_space correspondence contradiction export
  shared_math/  scalar vector matrix frames quaternion geometry
                intersection polygon projection homography complex
                optimisation numerical
  render/       scene camera_frame diagnostics recursion_gpu panel_space overlays hit_testing
  ui/           shell workspace context_hud drawers interactions exact_entry file_input
  workers/      scene_solver recursion_cpu export
  intent/       Part I records only (no solver imports of geometry)
integration/    versioned P→Q handoff schema + route-3 composite
tools/          validate.py build_all.py
tests/          domain + facade + CLOS-* + frozen fixtures
reference/      generated verification artefacts only
dist/           generated standalone HTML
releases/       APP/UI/CORE manifests + sha256
```

Temporary dual trees `mirror_rig/` and `loop_lab/` are allowed **only** while reconstructing v1.4 parity. After facade exists they become `domains/*` plus `integration/`. Duplicate maths is a validation failure (Part III §17.6).

# 3. Build sequence

Each phase has an exit gate. Later phases may not start until the gate is green, except where marked parallel.

## Phase 0 — Governance skeleton

Install: `tools/validate.py` (module graph, no-cycle, no UI→solver, no duplicate projection/reflection/homography authorities, hashes); APP/UI/CORE identity files; changelog category stubs; `.gitignore` for `dist/` as generated.

Exit: empty graph validates; identity `CORE 0.0.0 / UI 0.0.0 / APP unreleased`.

## Phase 1 — Shared maths + frozen fixtures

Implement `shared_math/*`. Freeze S17 kernel fixture: `S=256`, `alpha = n − i·q·L/2π` with real correction `alpha = (n − q·θ/2π) − i·qL/2π` when source rotation θ ≠ 0. Target published `|gamma|=22.5836845286`, `arg=157.6255960832°`. Pole `(I − kR)⁻¹t` from fixture, not a free `loop.pole`. Freeze S18 panel graph 469/900/432/72 identity.

Exit: CLOS-18 31/31 + 16/16; Cauchy–Riemann residual bound; det J > 0 on sample set; CLOS-19 identity fixture consumed unchanged.

## Phase 2 — Physical carrier P (v1.4 Mirror Rig)

Domains: pose (three trunk frames, torso twist, two-bone IK with branch report, joint limits); support contact; skeleton integrity; finite mirror aperture + reflection rays; camera frustum; visibility as midline arc length **and** S15 two-segment mirror-path enum; P four-corner projection + homography + inverse (S16); mirror-fit proposals requiring accept; `physical_limits` (DoF, lens_conformality, portal_resolution, display_aliasing, mirror_ghost, display_beat). Provenance tags on `CAPTURE_PRESET`: MEASURED / EMPIRICAL / REFERENCE / FREE.

Map constraint records to PASS/PROJECTED/FAIL with numeric residual. No silent clamp.

Exit: v1.4-equivalent pose suite + physical_limits suite; stock poses report unshootable as staged; CLOS-13/14/15 structural tests.

## Phase 3 — Recursive content Q (v1.4 Loop Lab)

Grid fixture; exact one-pole loop; `periodic_phase_warp` + `periodic_mask_solver` (Fourier torus, Λ-periodic by construction, bisection for max feasible amplitude). Fold/mask violation → PROJECTED with surviving scale, never silent repair. Certifier. Export.

Exit: 8-file Loop Lab equivalent; n,q integer family in lattice; orientation-preserving torus (preview flip ∘ mirror flip); phone tilt φ → source θ = 2φ.

## Phase 4 — Route-3 integration (first falsifiable artefact)

Versioned `integration/` record: P carrier quads, k, homography, sceneDepth; Q periodic source + certificate; composite; certify. Small raster only (≪ print master). Depth range of plate must equal S is a **gate**, not a default.

Exit: Scenario E (P/Q independence) and Scenario G (kernel) pass on the composite. This is the first artefact the project can be wrong about.

## Phase 5 — Facade, state, evidence metadata

One semantic scene. UI talks only through actions/selectors. Requested / effective / workspace / locks / proposals / history (S07, S08). Orthogonal parameter metadata: origin, role, epistemic state, mutability (S20 / CLOS-05). Reference load cannot mutate requested scene (CLOS-06). Intent actions that only write semantic records may PASS without invoking the physical solver.

Exit: architecture validator rejects UI importing solver internals; CLOS-05, CLOS-06.

## Phase 6 — Workbench UI (not APP v1 yet)

Home = Pose + Mirror. Authoritative camera frame centre. Modes: POSE | SCENE | COMPOSITION | RECURSION | INSPECT. One selection, one overlay. Requested ghost / effective solid / branch ghosts. Plan view edits the same requested scene (CLOS-11). Recursion UI: P/Q/fixed-point/q,n primary; coefficients in INSPECT (CLOS-17). Sparse visual language is UI-only.

Exit: CLOS-01, CLOS-02, CLOS-03, CLOS-11, CLOS-12, CLOS-17. Planning checkpoint, not APP v1.

## Phase 7 — Calibration, pose promotion, inverse metrics

Device calibration record + residuals + preview/save parity (S10 / CLOS-07). Pose evidence states; monocular links are image-space only (S11–S12). Promotion requires calibrated reprojection + support + hand + visibility (CLOS-08). Named metrics ν_D, ν_R, λ*, mirror/body/phone/screen; ν_D=0.438 remains tagged UNVERIFIED until measured. Sensitivity ranking and robustness margins (CLOS-09, CLOS-10). Composition vector ≠ aesthetic score.

Exit: CLOS-04, CLOS-07–10.

## Phase 8 — L0/L1/L2, warp, panel, correspondence, contradiction

Canonical rectification on import (closes HANDOVER gap: `distortionCorrected: true` is currently a lie). Scenario F. Protected domain warp (Scenario H). Panel cuts/connectors/holonomy (Scenario I) consuming S18 fixture. Correspondence residuals before blend. Contradiction ops non-destructive over valid base; each promoted op has law tag + hierarchy role (Part I A4, A17.6).

Exit: Scenarios F, H, I; CLOS-18/19 still green.

## Phase 9 — Intent layer (Part I)

`src/intent/` + ARTWORK panel. Records: OrdinaryReadReview, IntentClaim, EffectIntent, AddressIntent (private, public_export=false), composition roles, quiet zones, water path OPEN default, hair field, RecursiveStateIntent, MaterialRegionIntent, PerceptualEventPlan. Gates G0–G8 as review states, disjoint from scene PASS/PROJECTED/FAIL. Selectors listed in A16.4. No solver scores for misaddress/tenderness/humour.

Exit: Part I A21 items 1–12 as data+UI capability (human PASS of G1/G6/G7 remains human).

## Phase 10 — Paint Guide, persistence, scale

Paint Guide: UV/pixel/mm, staging sheet, 1:1 details, viewing-distance bands (CLOS-16). Deterministic project package (Scenario J). Worker split: main thread UI; scene solver / recursion CPU / export in workers. Print-resolution path: required masters ~28,500 px; implement tiled/offline export, do not preview at master size.

Exit: CLOS-16; Scenario J; export checksums.

## Phase 11 — Governed APP v1

Only after: facade-only UI; kernel+panel fixtures; P/Q independence; calibration import path (even if device record is UNKNOWN); promotion gates coded; manifest with parent, sha256, known_failures, validation_status. First identity: APP v1 / UI v1.0.0 / CORE v1.0.0. Bytes immutable after test use.

Exit: CLOS-20 plus Part III §20 items 1–12, with known_failures listing unshot plate, unverified ν_D, unvalidated SKIN/STANDOFF, no real-scene photograph.

# 4. v1.4 reconstruction inventory

Rebuild these capabilities; do not invent extra solvers.

**P / Mirror Rig (38 modules, 12 tests).** Trunk frames + twist; two-bone IK + branches; joint limits; support; skeleton integrity; finite aperture + rays; camera frustum; midline visibility; carrier homography ± inverse; mirror-fit accept; SVG frame export; `scene/physical_limits.js`.

**Q / Loop Lab (36 modules, 8 tests).** Fixture; loop; periodic phase warp + mask solver; certifier; export.

**Handover gaps → phase mapping.**

| gap | phase |
|---|---|
| no rectification on import | 8 |
| no capture model staging→shoot→import→verify | 7 + human shoot |
| no provenance on pose angles | 5 metadata; angles remain INVENTION until tagged |
| ν_D = 0.438 unverified | 7, tagged, not a hidden default optimum |
| SKIN, STANDOFF, thresholds unvalidated | 2, tagged FREE/EMPIRICAL |
| no print-resolution render | 10 |
| composition untouched | 6 + 9 |
| no photograph of actual scene | human; software exposes UNKNOWN |

# 5. Test surface

Keep `node tests/**/*.mjs` and `python3 tools/validate.py`. Add CLOS-01…20 as named cases. Part II §36 scenarios A–J are the e2e suite. Part I A18 tests are human protocols stored as review records, except geometric subclauses.

CPU kernel is authority. GPU UV parity is a tolerance check, not a second maths.

# 6. Stop-doing

- New standalone apps besides the one workbench.
- Aesthetic scores, saliency-as-proof, “more loops = better”.
- Promoting reference pixels to metric bone lengths.
- Invented load/pressure/contact geometry (S13).
- Hand-editing `dist/`.
- Reusing an APP identity after a byte change.
- Treating fixture PASS as physical evidence (Part III §16.5).
- Klein-bottle / unmirrored preview unless explicitly EXPERIMENT_ONLY.
- Closing water into a decorative loop when OPEN is the active hypothesis.

# 7. Immediate next implementation step

Phase 0 skeleton + Phase 1 `shared_math` + S17 fixture. Do not start UI. Do not start a new tool. After Phase 4 exists, the project has something that can fail for a reason other than missing files.
