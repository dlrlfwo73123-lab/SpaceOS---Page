"""실데이터 투입 실행기: 생성(fetch_ground) → 검증(verify_ground_output) → 보고서 한 파일.

  python tools/ground/run_all.py --gu seongdong                # 인터넷 되는 PC
  python tools/ground/run_all.py --gu seongdong --osm-json x.json --synthetic --out 폴더   # 이미 받은 파일/합성 샘플

보고서(`--report`, 기본 현재 폴더의 ground-run-report.md)를 그대로 붙여 넣으면 결과를 판정할 수 있다.
종료 코드: 0 통과 / 1 타일 무결성 실패 / 2 예산 초과 / 3 생성 단계 실패.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import verify_ground_output as vg  # noqa: E402


def _versions() -> dict:
    v = {"python": platform.python_version(), "platform": platform.platform()}
    for m in ("shapely", "pyproj", "numpy"):
        try:
            v[m] = __import__(m).__version__
        except ImportError:
            v[m] = "missing"
    return v


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--gu", default="seongdong")
    ap.add_argument("--out", type=Path, default=vg.DEFAULT_DIR)
    ap.add_argument("--report", type=Path, default=Path("ground-run-report.md"))
    ap.add_argument("--osm-json")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--synthetic", action="store_true")
    ap.add_argument("--clean", action="store_true")
    ap.add_argument("--chunk-deg", type=float)
    ap.add_argument("--sleep", type=float)
    a = ap.parse_args()

    cmd = [sys.executable, str(HERE / "fetch_ground.py"), "--gu", a.gu, "--out", str(a.out)]
    for flag, val in (("--osm-json", a.osm_json), ("--chunk-deg", a.chunk_deg), ("--sleep", a.sleep)):
        if val is not None:
            cmd += [flag, str(val)]
    cmd += [f for f, on in (("--offline", a.offline), ("--synthetic", a.synthetic), ("--clean", a.clean)) if on]

    t0 = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    fetch_s = round(time.time() - t0, 1)
    lines = [f"# 바닥·건물 타일 실행 보고서", "",
             f"- 시각(UTC): {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
             f"- 구: `{a.gu}` / 출력: `{a.out}` / 생성 소요 {fetch_s}s",
             f"- 환경: {json.dumps(_versions(), ensure_ascii=False)}", "",
             "## 1. 생성 단계", "", "```", (proc.stdout + proc.stderr).strip()[-3000:] or "(출력 없음)", "```"]
    code = 0
    if proc.returncode != 0:
        lines += ["", f"**생성 단계 실패 (종료 코드 {proc.returncode})** — 검증은 건너뜀. Overpass 접속/요청 제한을 확인하세요."]
        code = 3
    else:
        r = vg.audit(a.out)
        idx = a.out / "index.json"
        lines += ["", "## 2. 검증 단계", "", vg.to_markdown(r), "",
                  f"- index.json SHA-256: `{hashlib.sha256(idx.read_bytes()).hexdigest()}`"]
        code = 0 if r["ok"] and r["budget_ok"] else (1 if not r["ok"] else 2)
    lines += ["", f"## 결과 코드: {code}  (0 통과 / 1 무결성 실패 / 2 예산 초과 / 3 생성 실패)"]
    a.report.parent.mkdir(parents=True, exist_ok=True)
    a.report.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    print(f"\n→ 보고서: {a.report.resolve()}")
    sys.exit(code)


if __name__ == "__main__":
    main()
