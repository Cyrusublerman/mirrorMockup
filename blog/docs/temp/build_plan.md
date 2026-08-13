---
title: mirrorMockup build plan
object_type: execution_plan
status: current
date: 2026-08-13
authority: Governing Build Specification v1 (Coupled Composition + Print Gallery Tool), 13 Aug 2026
goal: one finished production tool; spec in; nothing else
repo_state: LICENSE only (CC0)
---

# 0. Object

Build the finished artist-facing tool defined by the Governing Specification. Stop when §27 items 1–19 are all true in one project.

Purpose of the tool (spec p.4): reconstruct and redesign P0 with one physically coherent body, phone/camera and finite mirror, such that exact Print Gallery recursion arises automatically from the reflected phone screen whenever that screen is validly visible.

One codebase. One scene authority. One implementation of each mathematical operation. No second app, no legacy tree, no parallel maths, no features the spec marks OUT_OF_SCOPE.

# 1. Authority

The spec is the build contract. Status labels in the spec apply. Where earlier project documents disagree, Appendix D of the spec wins.

**In:** spec §§0–27, Appendices A–F, fixtures named there (P0 I01 digitisation, optical special case as DIAGNOSTIC_ONLY, de Smit/Lenstra scale-256 kernel).

**Out:** Mega Build Part I intent/gates; panel-space; correspondence morph; contradiction catalogue; Fourier/exotic warps; dual Mirror Rig / Loop Lab apps; v1.4 packaging; handover stock-pose home; ARTWORK panel; water/hair/misaddress/paint theory; environment beyond floor/support/occlusion/reference; any second portal widget.

α, lattice, γ: use spec §18 and Appendix A. Kernel tests in §25.8 are the numeric oracle. Do not keep an alternate formula beside the spec.

# 2. Architecture (spec §0.4, §26)

```
UI  →  actions + selectors + facade  →  coupled solve_network  →  domains  →  shared_math
```

UI never owns physical truth. Renderers never own physical truth. Three.js/WebGL types exist only at render boundaries. CPU recursion is authority; GPU must match UV/lattice/singularity/P-Q within declared tolerance — not a second kernel.

Source layout is spec §26 exactly:

```
src/app/          facade actions selectors project_io
src/scene/        requested_state effective_state solve_network
                  solve_policy history proposals
src/domains/      body pose support hand_grip phone camera
                  apparatus mirror reflection visibility
                  composition carrier_p content_q recursion export
src/shared_math/  vector quaternion transform projection intersection
                  polygon homography complex numerical jacobian
src/render/       scene_3d artwork_camera overlays recursion_gpu diagnostics
src/ui/           interactions contextual_controls numeric_entry reference_overlay
src/workers/      network_solve_worker recursion_cpu_worker export_worker
fixtures/         P0/  optical_special_case/  recursion/
tests/
tools/validate.py
```

No other top-level product trees. `validate.py` rejects: UI→solver imports; duplicate projection/reflection/homography/log-map; production `ROTATE_MIRROR`; a second portal type; generated HTML treated as source.

# 3. Non-redundant state

One of each. Do not expose the same degree of freedom twice.

| Quantity | Owner |
|---|---|
| requested vs effective | scene |
| body definition vs pose | domains/body, domains/pose |
| wrist / grip / phone / screen / optical centre | hand_grip, phone, camera |
| capture camera | derived `T_WC = T_WP T_PC` when carrier=PHONE |
| production mirror pose | apparatus: `M = C + d_M f + p_u r + p_v u`, `n_M = −f_C` |
| general mirror plane | domains/mirror for tests/calibration only |
| P | DERIVED from reflected physical screen |
| Q | authored content; never moves P or the apparatus |
| artwork view | render/artwork_camera; must not write capture camera |
| Print Gallery field | domains/recursion, `I(z)=F(W(z))` |

Relation classes (spec §2.3): FREE, LOCKED, RELATION_LOCKED, DERIVED, AUTO_SOLVED, TARGETED, BOUNDED, EXPLORATORY.

Every edit: DRIVER / PRESERVE / ALLOWED_TO_MOVE. Transactions: PASS | PROJECTED | FAIL. Out-of-policy moves are proposals, never silent writes.

World: +X ∥ default mirror, +Y depth along default normal, +Z up, floor Z=0. Anatomical L/R is semantic.

# 4. Finished-tool behaviour

Implement spec interaction and completion, not a subset.

**Modes:** POSE | SCENE | COMPOSITION | RECURSION | INSPECT. One selection, one overlay. Actions/selectors = spec §22 (no production `ROTATE_MIRROR`). Startup = spec §24. Overlay stack = spec §14. Solve modes = spec §13.6. Pans are four named actions, not one “pan”.

**Print Gallery (spec §17–20).** `OFF | AUTO | ADVANCED` is the warp toggle. OFF: physical scene, Q on the screen, no loop. AUTO: if P valid, derive P, rectify, exact one-centre loop, certify, render; else named unavailability. ADVANCED: same P, selected loop controls, never detaches from P. Toggle does not move geometry.

**RECURSION view (spec §17, §20, §21.1, §25.9, §27.15–17).** The finished use of AUTO is a continuous view through the carrier:

- view camera may dolly along `C + s d_M f` from capture pose to the mirror (workspace; does not mutate capture camera);
- then approach the reflected phone until P fills the artwork frame;
- with AUTO on, further zoom is the same map `W(z)=α log(z−p)+β`, one visual period `log|γ|`;
- with OFF, stop at filled P (magnified Q).

P is already textured by `I(z)` whenever AUTO is on, so dolly/zoom are views of that field. A cut from 3D raster to a second Droste shader is out of spec. Physical portal size ≠ `|γ|`.

**Export (spec §27.19, domains/export).** Pixel image of the current artwork frame at current warp state and view, plus unwarped sibling when AUTO, plus staging prescription, composition overlay, recursive reference render. Sidecar: mode, view, P validity, certificate. JSON without pixels is not export.

# 5. Build order

Order is construction of the same finished tool. Each step exists only to make §27 true. Do not ship intermediate products.

1. **Graph + shared_math + fixtures.** `validate.py`. Spec §25.1. P0 IMAGE_NORM table (spec §1.1). Kernel Λ, (q,n), α, γ per §18 / §25.8. Parallel-case equations as DIAGNOSTIC_ONLY seeds (§10.2), not a second solver.

2. **Body, pose, support, IK.** Spec §§6–7, tests §25.2. Two-bone IK is a seed; production solve is coupled. Startup pose = P0 family. Other pose seeds only as regression fixtures named by the spec, not as product modes.

3. **Phone, camera, apparatus, mirror.** Spec §§5, 8–9, tests §25.3–25.4. Production controls: distance, aperture, U/V pan, autosolve, preserved reflected-phone ratio. FOV is a network variable.

4. **Reflection, visibility, P.** Spec §§11, 16, tests §25.5. P validity gates are the only capture/portal gates. Changing Q must not change P.

5. **Composition net + named solve modes.** Spec §§12–13, tests §25.6, Appendix C. P0_RECONSTRUCT reports residuals; zero residual is not required. No composition score.

6. **Q + recursion + artwork view + image export.** Spec §§17–20, §25.7–25.8. Warp toggle, AUTO attach, inverse-map sampling, no-fold, CPU reference, GPU parity. Artwork-camera dolly/approach/loop as above. `EXPORT_IMAGE` on the CPU renderer.

7. **Facade, overlays, UI.** Spec §§14, 21–24, tests §25.9. Full action list. Warp toggle and view scrub in RECURSION. Compensation inspectable.

8. **Persistence and §27.** Save/restore requested state without semantic drift. Restore warp mode and artwork view. Full export suite. Stop only when §27.1–27.19 hold together.

# 6. Tests

Spec §25 is the suite. CPU kernel is authority. Fixture PASS is not physical evidence (P0 pixels do not uniquely determine 3D). Parallel-case checks run only in matching axial conditions.

Required recursion-view tests (they are §25.7–25.8 plus §25.9 view non-mutation):

- AUTO available iff P valid;
- moving phone updates P and the field; moving Q does not;
- warp toggle frozen-geometry round trip;
- artwork dolly does not write capture camera;
- pixel residual across portal-fill;
- `I(τ)` vs `I(τ+log|γ|)` after lattice reduction;
- PNG ON and OFF at the same view.

# 7. Done

The tool is finished when spec §27.1–27.19 are simultaneously true, including: P0 loaded; pose and phone edits with coupled IK; camera and mirror relation-locked; named pans; composition fit with explicit residuals; AUTO portal from valid P; Q independent; loop certificate visible; warp toggleable; artwork view can travel camera→mirror→phone and continue through the loop without a pop; image export of current view.

Non-conformant (spec final statement): manual Droste rectangle; independent production mirror rotation; hidden solver compensation; duplicate DOF; second implementation of the same map.

# 8. First implementation slice

Create the §26 tree, `validate.py`, `shared_math`, P0 fixture, recursion kernel fixture. Then continue in §5 order without leaving finished-tool scope.
