---
name: Governing Spec v1 parity
overview: Match Mirror Portrait Coupled Composition + Print Gallery Tool Governing Build Specification v1 (13 Aug 2026). Mega Build is out of scope.
todos:
  - id: authority-tree
    content: §26 tree only. Strip panel-space, correspondence, contradiction, domain_warp, L0/L1/L2, orchestrator. validate.py requires v1 files.
    status: in_progress
  - id: pose-ik
    content: Bend/Tilt/Twist, coupled IK (root/clavicle), PHONE_DRIVES_HAND and HAND_DRIVES_PHONE, applied support plant, joint limits.
    status: pending
  - id: optics-pq
    content: Parallel apparatus lock, inspectable d_M autosolve, FOV as network variable, finite aperture + occlusion, P derived / Q independent, AUTO from valid P.
    status: pending
  - id: recursion
    content: I(z)=F(W(z)); loop period log|γ|; inverse desired-portal; no-fold detJ>0; CPU/GPU UV parity; no second Droste blit.
    status: pending
  - id: ui-contract
    content: Five modes; one selection one overlay; DRIVER/PRESERVE/ALLOWED_TO_MOVE on edits; four named pans; no ROTATE_MIRROR.
    status: pending
  - id: validation
    content: §25 tests + §27 artist workflow. Stop when those hold.
    status: pending
isProject: true
---

# Governing Build Specification v1

Authority: **Mirror Portrait Coupled Composition + Print Gallery Tool, Governing Build Specification v1**, 13 August 2026.

This document **replaces** the previous broad mega-document as tool-build authority. Mega extras in §0.3 are out of scope: panel-space, Fourier/exotic warps, correspondence/contradiction product domains, ARTWORK/G0–G8, dual apps.

PDF: `Mirror_Portrait_Coupled_Composition_Print_Gallery_Tool_Governing_Specification_v1_45c3.pdf`.

## Product

Reconstruct and redesign canonical P0 with one physically coherent body, phone/camera, and finite mirror. Print Gallery recursion arises automatically from the reflected phone screen whenever that screen is validly visible.

Non-conformant: manual Droste after moving the phone; independent production mirror rotation; hidden solver compensation.

## Source tree (§26)

```
src/app/          facade.js actions.js selectors.js project_io.js
src/scene/        requested_state.js effective_state.js solve_network.js
                  solve_policy.js history.js proposals.js
src/domains/      body/ pose/ support/ hand_grip/ phone/ camera/
                  apparatus/ mirror/ reflection/ visibility/
                  composition/ carrier_p/ content_q/ recursion/ export/
src/shared_math/  vector.js quaternion.js transform.js projection.js
                  intersection.js polygon.js homography.js complex.js
                  numerical.js jacobian.js
src/render/       scene_3d.js artwork_camera.js overlays.js
                  recursion_gpu.js diagnostics.js
src/ui/           interactions.js contextual_controls.js
                  numeric_entry.js reference_overlay.js
src/workers/      network_solve_worker.js recursion_cpu_worker.js
                  export_worker.js
fixtures/         P0/ optical_special_case/ recursion/
tests/
```

## Completion (§27)

Artist can, in one project: open P0 + overlay; start from P0 pose family; Bend/Tilt/Twist + IK; phone move with hand follow; camera follows phone; mirror rotationally parallel; d_M/aperture/pans without duplicate DOF; visible autosolve; FOV coupled; four pans; P0 fit with hard/soft targets; inspect requested/effective; finite visibility/occlusion; derive P; AUTO portal from valid P; edit Q without moving P; loop diagnostics; save/restore; export staging + overlay + recursive reference.
