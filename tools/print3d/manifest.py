"""Reproducibility manifest: pins the commit, input SHA-256 hashes and tool versions."""
from __future__ import annotations

import hashlib
import json
import platform
import subprocess
import sys
from datetime import date
from pathlib import Path


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def git_commit(repo: str | Path = ".") -> str | None:
    try:
        out = subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"],
                             capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def tool_versions() -> dict[str, str]:
    versions = {"python": platform.python_version()}
    for name in ("numpy", "pyproj", "shapely", "trimesh"):
        try:
            versions[name] = __import__(name).__version__
        except ImportError:
            versions[name] = "missing"
    return versions


def build_manifest(inputs: list[str | Path], repo: str | Path = ".",
                   crs: str = "EPSG:5186", scale_denominator: int = 1000) -> dict:
    return {
        "commit": git_commit(repo),
        "created": date.today().isoformat(),
        "crs": crs,
        "scale_denominator": scale_denominator,
        "inputs": {str(p): sha256_file(p) for p in inputs},
        "tools": tool_versions(),
    }


if __name__ == "__main__":
    print(json.dumps(build_manifest(sys.argv[1:]), indent=2, ensure_ascii=False))
