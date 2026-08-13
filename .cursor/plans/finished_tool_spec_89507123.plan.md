---
name: Mega Build Authority Part II
overview: Match Mirror Portrait Mega Build Authority Part II (Complete Product / Core Build Specification) plus Part III CLOS-01–20. Current repo was built to Governing Spec v1 and is not a Mega match.
todos:
  - id: authority-tree
    content: Adopt Part II source tree (orchestrator, panel_space, correspondence, contradiction, domain_warp, L0/L1/L2, Paint Guide). validate.py requires Mega domains; no dual maths.
    status: in_progress
  - id: separations
    content: Enforce Part II §0.2 non-negotiable separations including L0≠L1≠L2, O≠p_T≠p_W, P≠Q, loop≠warp, valid-base≠contradiction
    status: pending
  - id: workbench
    content: Four-region workbench; artwork frame is drawing authority; A–E slots; inverse edits from the camera frame (§37.1)
    status: pending
  - id: pose-body
    content: Coupled pose, visible-body masses vs skeleton, support plant, five named hand contacts, reach shells, branch explorer
    status: pending
  - id: optics-p
    content: General finite aperture; visibility enum aperture/no-intersection/two occlusion segments; calibrated camera; P independent of Q
    status: pending
  - id: l0l1l2
    content: Canonical rectification C_i, T01≈T12 residual, L0/L1/L2 tests §36.9
    status: pending
  - id: kernel-warp
    content: Frozen kernel 31/31+16/16; domain warp detJ/K; GPU UV parity; τ period log|γ|
    status: pending
  - id: panel-corr-contra
    content: Panel-space 469/900/432/72 identity fixture; correspondence morph validation; non-destructive contradiction layer
    status: pending
  - id: clos-release
    content: CLOS-01–20, Paint Guide UV/pixel/mm, APP/UI/CORE identity. Stop only when Part II §37.1–22 and Part III DoD 1–12 hold
    status: pending
isProject: true
---

# Mega Build Authority Part II

Authority: **Mirror Portrait Mega Build Authority**, 13 Aug 2026.

- **Part II** (pp. 21–108) = product/core build. This is “Authority 2”.
- **Part III** sharpens overlapping Part II detail (CLOS-01–20).
- **Part I** governs artistic review (G0–G8, ARTWORK) and cannot override physical/math truth.
- **Part IV** is the source-ID register.

Governing Spec v1 is **not** the match target. v1 explicitly excluded Mega items (panel-space, correspondence, contradiction, ARTWORK/G0–G8, dual apps). That exclusion is void.

PDF: `Mirror_Portrait_Mega_Build_Authority_910f.pdf`. Precedence: Part III > Part II on conflict; neither overrides physical truth.

## Product (Part II §0)

One workbench. Not a 3D modeller, pose app, Droste filter, or two HTML experiments. Direction:

artwork target → requested+locks → kinematic solve → optical solve → L0/L1/L2 / Q → recursion → raster + Paint Guide.

PASS | PROJECTED | FAIL. PROJECTED keeps requested as ghost.

## Non-negotiable separations (§0.2)

requested≠effective; world≠image; skeleton≠visible mass; anatomical L/R ≠ display L/R; wrist/hand/grip/phone/screen/optical-centre; aperture≠reflected scale; HFOV≠S; **P≠Q**; **L0≠L1≠L2**; **O ≠ p_T ≠ p_W**; recursive_depth ≠ temporal_index; exact loop ≠ optional warp; panel topology ≠ transform ≠ connector ≠ route; valid base ≠ declared contradiction; hard ≠ soft.

## Source tree (Part II §3)

```
src/app/          bootstrap facade actions selectors project_io
src/scene/        requested_state effective_state orchestrator
                  solve_policy history proposals dependency_graph
src/domains/      pose body support hand_grip phone camera mirror
                  reflection visibility constraints composition
                  reference_alignment carrier_p canonical_content
                  recursion domain_warp panel_space correspondence
                  contradiction export
src/shared_math/  scalar vector matrix frames quaternion geometry
                  intersection polygon projection homography complex
                  optimisation numerical
src/render/       scene camera_frame diagnostics recursion_gpu
                  panel_space overlays hit_testing
src/ui/           shell workspace context_hud drawers interactions
                  exact_entry file_input
src/workers/      scene_solver_worker recursion_cpu_worker export_worker
```

UI must not import solver/math. One owner per map (projection, homography, complex, log map).

## Done

Part II **§37.1–22** and Part III **definition of done 1–12** plus **CLOS-01–20** simultaneously. Isolated kernel PASS is not completion. Frozen panel fixture 469/900/432/72 and kernel 31/31+16/16 remain independent tests.

Keep existing P/Q/kernel/GLB/prism/slab. Add Mega domains; do not keep a second implementation of the same map.
