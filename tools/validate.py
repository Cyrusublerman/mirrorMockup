#!/usr/bin/env python3
"""Architecture validator. Spec §26. Rejects duplicate authorities and UI→solver imports."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

ALLOWED_TOP = {
    "app", "scene", "domains", "shared_math", "render", "ui", "workers"
}

BANNED_FROM_UI = re.compile(
    r"from\s+['\"](?:\.\./)+shared_math/|from\s+['\"](?:\.\./)+domains/"
)
MEGA_BANNED = [
    "src/domains/panel_space",
    "src/domains/correspondence",
    "src/domains/contradiction",
    "src/domains/domain_warp",
    "src/domains/canonical_content",
    "src/scene/orchestrator.js",
    "src/domains/composition/layers.js",
]
OWNERS = {
    "projection.js": 0,
    "homography.js": 0,
    "complex.js": 0,
    "quaternion.js": 0,
}


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT)).replace("\\", "/")


def main() -> int:
    errors: list[str] = []
    if not SRC.exists():
        errors.append("missing src/")
        print("\n".join(errors))
        return 1

    extras = [p.name for p in ROOT.iterdir() if p.is_dir() and p.name not in {
        "src", "fixtures", "tests", "tools", ".git", ".cursor", "node_modules", "dist"
    }]
    for e in extras:
        errors.append(f"unexpected top-level product tree: {e}")

    for banned in MEGA_BANNED:
        p = ROOT / banned
        if p.exists():
            errors.append(f"out-of-scope Mega path present: {banned}")

    js_files = list(SRC.rglob("*.js"))
    for path in js_files:
        text = path.read_text(encoding="utf-8")
        r = rel(path)
        name = path.name
        if name in OWNERS:
            OWNERS[name] += 1
        if r.startswith("src/ui/") and BANNED_FROM_UI.search(text):
            errors.append(f"UI imports solver/math: {r}")
        if r.endswith("app/actions.js") and "ACTION_NAMES" in text:
            if re.search(r'ACTION_NAMES[\s\S]*?["\']ROTATE_MIRROR["\']', text):
                errors.append("ROTATE_MIRROR listed as a production action")

    for name, count in OWNERS.items():
        if count > 1:
            errors.append(f"duplicate authority file {name} appears {count} times")
        if count == 0:
            errors.append(f"missing shared_math authority {name}")

    required = [
        "src/app/facade.js",
        "src/app/actions.js",
        "src/app/selectors.js",
        "src/app/project_io.js",
        "src/scene/requested_state.js",
        "src/scene/effective_state.js",
        "src/scene/solve_network.js",
        "src/scene/solve_policy.js",
        "src/scene/history.js",
        "src/scene/proposals.js",
        "src/domains/body/skeleton.js",
        "src/domains/pose/solve.js",
        "src/domains/support/contact.js",
        "src/domains/hand_grip/grip.js",
        "src/domains/phone/prism.js",
        "src/domains/camera/model.js",
        "src/domains/apparatus/relation.js",
        "src/domains/mirror/mesh.js",
        "src/domains/reflection/reflect.js",
        "src/domains/visibility/report.js",
        "src/domains/composition/targets.js",
        "src/domains/carrier_p/project.js",
        "src/domains/content_q/content.js",
        "src/domains/recursion/kernel.js",
        "src/domains/export/image.js",
        "src/shared_math/vector.js",
        "src/shared_math/quaternion.js",
        "src/shared_math/transform.js",
        "src/shared_math/projection.js",
        "src/shared_math/intersection.js",
        "src/shared_math/polygon.js",
        "src/shared_math/homography.js",
        "src/shared_math/complex.js",
        "src/shared_math/numerical.js",
        "src/shared_math/jacobian.js",
        "src/render/scene_3d.js",
        "src/render/artwork_camera.js",
        "src/render/overlays.js",
        "src/render/recursion_gpu.js",
        "src/render/diagnostics.js",
        "src/ui/interactions.js",
        "src/ui/contextual_controls.js",
        "src/ui/numeric_entry.js",
        "src/ui/reference_overlay.js",
        "src/workers/network_solve_worker.js",
        "src/workers/recursion_cpu_worker.js",
        "src/workers/export_worker.js",
        "fixtures/P0/base_female_rigged.glb",
        "fixtures/P0/skeleton_map.json",
        "fixtures/P0/landmarks.json",
        "fixtures/optical_special_case/parallel.js",
        "fixtures/recursion/kernel.js",
    ]
    for req in required:
        if not (ROOT / req).exists():
            errors.append(f"missing {req}")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS")
    print(f"checked {len(js_files)} js files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
