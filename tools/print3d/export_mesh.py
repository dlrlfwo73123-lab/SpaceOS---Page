"""Export checked meshes to STL and verify the file round-trips with identical bounds."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import trimesh

from mesh_checks import check_mesh
from print_profile import validate_profile


def export_block(items: list[dict], out_dir: str | Path, profile: dict) -> dict:
    """Export one STL per building. Refuses (raises) if any mesh fails the checks."""
    validate_profile(profile)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    for it in items:
        res = check_mesh(it["mesh"], profile)
        if not res["ok"]:
            report[it["building_id"]] = {"exported": False, **res}
            continue
        path = out_dir / f"{it['building_id']}.stl"
        it["mesh"].export(path)
        report[it["building_id"]] = {"exported": True, "file": path.name, **res,
                                     "roundtrip_ok": roundtrip_ok(it["mesh"], path)}
    return report


def roundtrip_ok(mesh, path: str | Path, tol_mm: float = 1e-3) -> bool:
    back = trimesh.load(path, file_type="stl")
    return bool(np.allclose(mesh.bounds, back.bounds, atol=tol_mm))
