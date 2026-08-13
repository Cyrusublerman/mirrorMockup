---
name: Polished UI Build Authority v1
overview: Product UI is Final Polished UI Build Authority v1. Governing Spec v1 remains math/physics authority. Debug harness is not the product.
todos:
  - id: app-shell
    content: Replace five-mode debug HUD with POSE|SCENE|RECURSION AppShell, inset, Inspect drawer.
    status: completed
  - id: pointer
    content: Hit-test IK/BTT/phone/mirror; editor orbit; one-drag one-undo; inset-only HFOV pinch.
    status: completed
  - id: overlays
    content: Private reference + overlay catalogue; derived P; no second Droste blit; no mirror rotation.
    status: completed
  - id: security
    content: Pin remote.html to commit SHA; allowlist localhost ?repo=; text-only boot errors; build stamp.
    status: completed
  - id: validation
    content: validate.py tree + UI tests + existing solver tests green.
    status: in_progress
isProject: true
---

# Polished UI + Governing Spec

UI authority: **Final Polished UI Build Authority v1**. Math/physics: **Governing Spec v1**. Audit defects remain open for solver reachability; they are not waived by UI polish.

Product: artist edits visible targets; solver owns anatomy, optics, P, Q. Not a character editor, parameter dashboard, or Droste console.

## Rooms

Portrait strip (one row): `POSE | SCENE | RECURSION`. Composition is an overlay layer. Inspect is a drawer. Five-mode nav is forbidden.

## Tree (`src/ui`)

`app_shell.js` plus `rooms/`, `viewport/`, `manipulators/`, `overlays/`, `hud/`, `state/`, `adapters/`. Frozen debug harness under `src/ui/debug/` and `debug.html`.

`index.html` and `remote.html` boot production `interactions.js` → `app_shell.js`.

## Remote loader

Pinned commit SHA only. `?repo=` allowed for localhost. Errors via `textContent`.
