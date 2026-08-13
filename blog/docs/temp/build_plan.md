---
title: mirrorMockup build plan
object_type: execution_plan
status: current
date: 2026-08-13
supersedes: 2026-08-13 plan under Mega Build Authority Parts I–IV
authority: Governing Build Specification v1 (Coupled Composition + Print Gallery Tool), 13 Aug 2026
repo_state: LICENSE only (CC0). No src, tests, or dist.
---

# 0. Authority change

The Coupled Composition spec **replaces** Mega Build as build authority for this repo. Mega Build remains a recovered source (spec E.1.6), not the product contract.

Status labels in that spec are binding: ALREADY_GOVERNED, RECOVERED, CONFLICT_RESOLVED, NEW_REQUIREMENT, DIAGNOSTIC_ONLY, OUT_OF_SCOPE.

**Product purpose (verbatim object).** Reconstruct and redesign the composition of canonical reference P0 with one physically coherent body, phone/camera and finite mirror, such that exact Print Gallery recursion arises automatically from the reflected phone screen whenever that screen is validly visible.

The governing object is a **coupled constraint network**, not a pipeline and not two apps.

# 1. What the previous plan got wrong

| Previous lock | Spec verdict | Action |
|---|---|---|
| Mega Build Parts I–IV govern the repo | Part I artistic theory, panel-space, contradiction, Paint Guide-as-OS are OUT_OF_SCOPE for this tool | Drop Phases 8 (panel/correspondence/contradiction), 9 (intent/G0–G8), Mega-Build CLOS matrix as completion |
| Reconstruct Mirror Rig + Loop Lab as dual trees, then `integration/` handoff | One facade, one scene, P derived / Q authored / AUTO portal | No dual apps. No Loop Lab product. `integration/` is not a third program |
| Route 3 (author Q, composite into P) as first falsifiable artefact | AUTO: valid reflected P **is** the portal; no manual Droste rectangle | Route 3 survives only as P≠Q. First artefact is P0 reconstruction + AUTO attach |
| Solve as dependency graph / left-to-right order | CONFLICT_RESOLVED: simultaneous net; eval order is numerical only | `solve_network.js`, not `dependency_graph.js` |
| Artist-facing general mirror yaw/pitch/roll (v1.4) | NEW_REQUIREMENT: production rotation relation-locked `n_M = −f_C` | No `ROTATE_MIRROR` in facade. General plane stays test/calibration only |
| Mirror as world XYZ | Production: `M = C + d_M f + p_u r + p_v u` | Apparatus domain is first-class |
| Startup from stock poses (stand/twist/kneel/…) | Startup is P0 family + P0 observed IMAGE_NORM profile | Stock seeds are regression only |
| Composition after physics (old Phase 6+9) | Composition is first-class state from day 1 | P0 profile is a domain, not a later UI |
| Fourier `periodic_phase_warp` as production Q path | Exotic/Fourier warp OUT_OF_SCOPE in ordinary UI | Q is authored periodic content; kernel is one-centre log map |
| L0/L1/L2 as a major product layer | Topology is `phone/front-camera → subject → mirror` | Keep direct vs reflected vs screen as projections of one state, not three content worlds |
| HandoVER physical_limits as headline v1.4 port | Feasible set requires screen-facing, footprint, aperture inclusion | Keep as P-validity gates, not a separate product chapter |
| `α = n − qθ/2π − i qL/2π` (handover) vs spec `α = n + qθ_s/2π − i qL/2π` | Sign of θ term disagrees | Do not lock either sign until S17/`γ` fixture decides |

# 2. What survives

- P ≠ Q. P is DERIVED from reflected physical screen. Q never moves body/phone/camera/mirror/P.
- Requested ≠ effective. `PASS | PROJECTED | FAIL`. No silent clamp. Proposals for out-of-policy moves.
- Facade → actions/selectors → solve → isolated domains → shared_math. UI never owns truth.
- ES modules. Maths free of Three.js types. CPU kernel authority; GPU UV parity is a tolerance.
- Published de Smit/Lenstra `S=256` regression remains a kernel fixture.
- Evidence ≠ metric 3D truth. P0 landmarks are OBSERVED composition targets. 3D pose is INFERRED/MODELLED until calibrated.
- Do not invent unmeasured FOV/mirror-mm as MEASURED.
- No aesthetic score.
- Human-only: real device calibration, measured body links, whether P0 is uniquely realisable (it is not).

# 3. Locked production rules (do not reopen)

1. Coupled net, not a chain. Every edit declares DRIVER / PRESERVE / ALLOWED_TO_MOVE.
2. Relation vocabulary: FREE, LOCKED, RELATION_LOCKED, DERIVED, AUTO_SOLVED, TARGETED, BOUNDED, EXPLORATORY.
3. Production apparatus: `T_WC = T_WP T_PC`; mirror parallel, `n_M = −f_C`. Duplicate DOF forbidden (distance vs independent XYZ).
4. Three pans are distinct actions: `PAN_MIRROR_WINDOW`, `PAN_REFLECTED_CONTENT`, `PAN_APPARATUS` / `PAN_OUTER_FRAME`.
5. Print Gallery: `OFF | AUTO | ADVANCED`. AUTO requires no manual portal. ADVANCED never detaches from physical P.
6. Physical portal size ≠ recursive `|γ|`. Do not label S and `|γ|` as one scale.
7. World: +X ∥ default mirror, +Y depth along default mirror normal, +Z up, floor Z=0.
8. Anatomical L/R is semantic; never inferred from screen side or mirror parity.
9. Two-bone IK is a seed. Production solve is coupled (shoulder, elbow, wrist, clavicle, ribcage, root, optional grip).
10. Parallel axial formulae (§10.2) are DIAGNOSTIC_ONLY, used for seeds/sensitivity checks, not as the solver.
11. I01 P0 digitisation is default composition-coordinate authority. Earlier flattened shape register is diagnostic only (§24.3).

# 4. Explicitly out of this repo

Broad painting/gallery theory; misaddress; material paint strategy; water/hair/bathroom as conceptual devices; illusion catalogues; panel-space / stepped-hex; Penrose/Cafe Wall/eye/mouth experiments; multi-centre, dipole, figure-eight, Fourier, exotic warps; environment beyond floor/support/occlusion/reference; ARTWORK intent panel; G0–G8 artistic gates; standalone Loop Lab.

# 5. Target source layout

Match spec §26.

```
src/
  app/        facade actions selectors project_io
  scene/      requested_state effective_state solve_network
              solve_policy history proposals
  domains/    body pose support hand_grip phone camera
              apparatus mirror reflection visibility
              composition carrier_p content_q recursion export
  shared_math/ vector quaternion transform projection intersection
               polygon homography complex numerical jacobian
  render/     scene_3d artwork_camera overlays recursion_gpu diagnostics
  ui/         interactions contextual_controls numeric_entry reference_overlay
  workers/    network_solve_worker recursion_cpu_worker export_worker
fixtures/
  P0/         source hash, IMAGE_NORM landmarks, pose seed, profile
  optical_special_case/
  recursion/  S=256 kernel
tools/        validate.py
tests/
```

No `intent/`, `panel_space/`, `correspondence/`, `contradiction/`, `domain_warp/`, `mirror_rig/`, `loop_lab/`.

# 6. Build sequence

Exit gates are spec §25 tests and, at the end, §27 workflow. Later phases do not start until the gate is green.

## Phase 0 — Governance skeleton

`tools/validate.py`: one-way imports, no UI→solver, no duplicate projection/reflection/homography/apparatus authorities, no `ROTATE_MIRROR` on the production facade. Identity files may exist but APP v1 is not a phase goal until §27 is true.

Exit: empty graph validates.

## Phase 1 — Shared maths + kernel + P0 fixture data

`shared_math/*` per §25.1. Freeze recursion fixture: lattice Λ, integer (q,n), log map, published `|γ|` and arg; **resolve α θ-sign against that oracle**. Store P0 observed table from spec §1.1 as `fixtures/P0/` (IMAGE_NORM, 2D elbow/knee observations tagged OBSERVED, not 3D joints). Parallel special-case equations as `fixtures/optical_special_case/` DIAGNOSTIC_ONLY.

Exit: §25.1; kernel reconstruction residual; P0 table round-trips; α sign locked by fixture not by prose.

## Phase 2 — Body, pose, support, coupled IK

Minimum skeleton §6.2. BodyDefinition ≠ PoseState. Bend/Tilt/Twist. Two-link reach shell + branch stability. Support pins; P0 may use a horizontal plane at modelled tub height. Phone-driven and hand-driven grip, never both hidden. Coupled IK uses two-bone as seed.

Startup pose = P0 family (near-upright rear, bent phone-arm elbow ~132.95° **as 2D evidence**, near-straight knees). Other seeds are tests only.

Exit: §25.2.

## Phase 3 — Apparatus: phone, camera, mirror

Rigid phone; four metric screen corners independent of Q. `T_WC = T_WP T_PC`. FOV is a network variable. Mirror domain evaluates a general plane; **production parameterisation is apparatus** (`d_M`, `p_u`, `p_v`, width, height). Default `p_u=p_v=0`. Autosolve `d_M` to a reflected-phone ratio reports old/new `d_M`, target, residual, compensating variable. No silent aperture growth; fit is a proposal.

World convention §4.

Exit: §25.3 and §25.4, including: phone rotation rotates camera and mirror; no production yaw/pitch/roll drift; autosolve cannot invert depth order; parallel-case signs match general solver when conditions match.

## Phase 4 — Reflection, visibility, P carrier

Point reflection; virtual-camera equivalence; finite-aperture hit; disjoint visibility intervals; same-anatomy `λ*` on a named interval; occlusion tests §11.6. P projection chain §16.1. P validity gates §16.2 (corner order, +depth, convex area, homography condition, pixel footprint, facing, aperture inclusion, occlusion policy).

Exit: §25.5; moving phone/mirror changes P; changing Q does not.

## Phase 5 — Composition profile + constraint net + named solve modes

CompositionTarget in IMAGE_NORM. P0_PROFILE from §12.2. Metrics §12.3; no scalar score. Hard vs soft §12.4. Relation classes §2.3. Every action carries DRIVER/PRESERVE/ALLOWED_TO_MOVE. Modes: POSE_FIRST, PHONE_FIRST, MIRROR_RATIO_FIRST, COMPOSITION_FIT, P0_RECONSTRUCT, MANUAL. Layered numerical strategy §13.3 without claiming a conceptual pipeline. Sensitivity `S_ij` and influence ranking; robustness margins. Proposals §3.4.

**First falsifiable artefact:** P0_RECONSTRUCT reports residuals for every §25.6 landmark/bbox. Zero residual is not required. Hidden trade-offs are a fail.

Exit: §25.6; Appendix C examples C.1–C.4 as named tests.

## Phase 6 — Q + AUTO recursion

Q fill/contain/cover, scale, offset, rotation, crop. PRINT_GALLERY OFF/AUTO/ADVANCED. AUTO: if P valid → rectify → similarity-compatible canonicalisation if possible → exact one-centre loop → certify → render; else named unavailability. Inverse portal design §18.8; reject incompatible S≤1 or non-similarity portals instead of faking a loop. Finite-portal uniformisation only when physical geometry requires it (§19.4 priority). Inverse-map sampling, Jacobian/no-fold, mip/footprint filtering; no fixed blur. CPU reference renderer.

Exit: §25.7 and §25.8. AUTO never needs a second aligned rectangle.

## Phase 7 — Facade, overlays, UI contract

Actions/selectors exactly §22 (no production `ROTATE_MIRROR`). Modes POSE/SCENE/COMPOSITION/RECURSION/INSPECT. One selection, one overlay. Required overlay stack §14; sparse default, all available. Automatic compensation must be inspectable (§14.1) or it is a UI failure. Four pan verbs. Requested ghost / effective solid. P0 loaded at startup per §24.1 with provenance-labelled body/device, FOV HYPOTHESIS if uncalibrated.

Exit: §25.9; §27 items 1–13 as interaction, not styling.

## Phase 8 — Persistence, export, completion

Save/restore requested state without semantic drift. Export: physical staging prescription, composition overlay, recursive reference render. That is the export product; not Mega Build Paint Guide OS.

Exit: spec §27 items 1–19 simultaneously. A build that re-aligns a Droste rectangle after moving the phone, independently rotates the mirror in production, or hides compensation is non-conformant.

# 7. v1.4 code: reuse, do not resurrect as product shape

Reuse as domain maths if reconstructed: IK primitives, reflection, frustum, homography, kernel constants, visibility intervals, P validity.

Do not port: dual-app packaging; artist-facing general mirror SO(3); stock-pose home screen; Loop Lab warp UI; `distortionCorrected: true` without rectify (rectify lives inside AUTO mapping, Phase 6).

Capture limits (DoF, aliasing, ghost, beat) may attach to P-validity / staging export as named residuals. They are not a reason to delay P0+AUTO.

# 8. Stop-doing (updated)

- Dual apps, `integration/` as a third program, ARTWORK/intent layer, panel-space, contradiction catalogue.
- Dependency-chain architecture diagrams as implementation truth.
- Independent mirror rotation in production UI.
- Duplicate DOF (distance plus unconstrained mirror XYZ).
- Dragging a reflected-phone sprite or editing P as a 2D portal.
- Treating FOV as zoom.
- Using mirror aperture as a proxy for reflected-body magnification.
- One ambiguous “pan”.
- Fourier/exotic warp UI.
- Hiding guessed millimetres as MEASURED.
- Claiming unique 3D from P0 pixels.
- Aesthetic scores.

# 9. Immediate next implementation step

Phase 0 + Phase 1 only: validate graph, shared_math, kernel fixture with α-sign resolved by `|γ|`, P0 IMAGE_NORM table on disk. No UI. No second app. No intent schema.
