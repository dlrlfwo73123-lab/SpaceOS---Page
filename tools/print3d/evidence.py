"""Gate for 'measured' claims, plus a delivery scan for secret files."""
from __future__ import annotations

import re
from pathlib import Path

REQUIRED_EVIDENCE = ("drawing_ref", "measured_on", "measured_by", "accuracy_m")
SECRET_NAMES = re.compile(r"(^\.env($|\.)|\.pem$|\.key$|id_rsa|credentials|settings\.local\.json$)", re.I)
SECRET_CONTENT = re.compile(r"(api[_-]?key|secret|token|serviceKey)['\"]?\s*[=:]\s*['\"]?[A-Za-z0-9_\-]{16,}", re.I)


def classify_geometry(record: dict) -> str:
    """'measured' only with full evidence; otherwise 'unverified' (accuracy is never assumed)."""
    if all(record.get(k) not in (None, "") for k in REQUIRED_EVIDENCE):
        return "measured"
    return "unverified"


def scan_delivery(root: str | Path) -> list[str]:
    bad = []
    for p in Path(root).rglob("*"):
        if not p.is_file() or ".git" in p.parts:
            continue
        if SECRET_NAMES.search(p.name) and not p.name.endswith(".example"):
            bad.append(str(p))
        elif p.suffix in {".py", ".md", ".json", ".txt", ".yml", ".yaml", ".toml", ".cfg"}:
            try:
                if SECRET_CONTENT.search(p.read_text(encoding="utf-8", errors="ignore")):
                    bad.append(str(p))
            except OSError:
                pass
    return bad
