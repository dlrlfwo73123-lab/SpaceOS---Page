"""생성된 바닥·건물 타일 감사 + 성능 예산 판정 (실데이터 투입 게이트).

  python tools/ground/verify_ground_output.py [타일폴더] [--json 결과.json] [--md 요약.md]

종료 코드: 0 = 통과, 1 = 스키마/무결성 오류(ERROR), 2 = 오류는 없지만 예산 초과(BUDGET).
검사: index↔파일 일치, 타일 스키마, 좌표 유한·서울/타일 범위, 삼각형 인덱스, 퇴화 삼각형 비율, 건물 필드,
면적·건물 높이 추정 비율, 그리고 모든 타일을 중심으로 열었을 때(반경 1km) 최악의 전송량·삼각형 수.
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

REPO = Path(__file__).resolve().parents[2]
DEFAULT_DIR = REPO / "apps/frontend/public/data/ground/seoul"
TILE_DEG = 0.01
SEOUL = (37.40, 126.70, 37.75, 127.20)       # (남, 서, 북, 동) 넉넉한 서울 범위
KINDS = {"carriageway", "sidewalk", "crosswalk"}
M_PER_LAT = 111320.0
BUDGET = {
    "open_1km_gzip_bytes": 1_500_000,
    "total_tris": 250_000,          # 바닥 + 건물 렌더 반경(600m) 안
    "tile_gzip_max": 400_000,
    "degenerate_ratio": 0.01,
}
RENDER_R = 600.0   # BuildingLayer.BUILDING_RADII[0]
LOAD_R = 1000.0    # groundTiles.loadGround 반경


def _fin(v) -> bool:
    return isinstance(v, (int, float)) and math.isfinite(v)


def _bld_tris(n: int) -> int:
    return 2 * n + (n - 2)


def audit(dir_: Path, budget: dict | None = None) -> dict:
    budget = {**BUDGET, **(budget or {})}
    errors, warns = [], []
    err = lambda m: errors.append(m)  # noqa: E731
    idx_path = dir_ / "index.json"
    if not idx_path.exists():
        return {"ok": False, "errors": [f"index.json 없음: {dir_}"], "warnings": [], "budget": {}, "stats": {}}
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    if idx.get("v") != 1:
        err(f"index.v != 1 ({idx.get('v')})")
    if idx.get("tileDeg") != TILE_DEG:
        err(f"tileDeg != {TILE_DEG} ({idx.get('tileDeg')})")
    keys = idx.get("tiles", [])
    if len(set(keys)) != len(keys):
        err("index.tiles 에 중복 키")
    files = {p.stem for p in dir_.glob("*.json") if p.name != "index.json"}
    for k in sorted(set(keys) - files):
        err(f"index 에 있으나 파일 없음: {k}")
    for k in sorted(files - set(keys)):
        warns.append(f"고아 타일(index 에 없음): {k}")
    meta = idx.get("meta", {})
    for f in ("source", "attribution", "synthetic", "generated"):
        if f not in meta:
            err(f"index.meta.{f} 없음")
    if meta.get("synthetic") is True:
        warns.append("index.meta.synthetic = true: 합성 데이터")

    sizes, tris, blds_info = {}, {}, {}
    total = {"tiles": 0, "triangles": 0, "degenerate": 0, "buildings": 0, "buildings_est": 0,
             "area_est": 0.0, "area_meas": 0.0, "layers": 0}
    for k in keys:
        f = dir_ / f"{k}.json"
        if not f.exists():
            continue
        raw = f.read_bytes()
        sizes[k] = (len(raw), len(gzip.compress(raw, 6)))
        try:
            t = json.loads(raw)
        except ValueError as e:
            err(f"{k}: JSON 파싱 실패 {e}")
            continue
        total["tiles"] += 1
        if t.get("v") != 1 or t.get("tile") != k:
            err(f"{k}: v/tile 필드 불일치 (v={t.get('v')}, tile={t.get('tile')})")
        try:
            ty, tx = (int(v) for v in k.split("_"))
        except ValueError:
            err(f"{k}: 키 형식 오류")
            continue
        s, w, n, e = ty * TILE_DEG, tx * TILE_DEG, (ty + 1) * TILE_DEG, (tx + 1) * TILE_DEG
        mg = 0.0006  # 타일 경계 허용(약 60m): 단순화/반올림 여유
        a = t.get("area_m2") or {}
        if not (_fin(a.get("estimated")) and _fin(a.get("measured"))):
            err(f"{k}: area_m2 없음/비정상")
        else:
            total["area_est"] += a["estimated"]; total["area_meas"] += a["measured"]
        ttri = 0
        for li, L in enumerate(t.get("layers", [])):
            total["layers"] += 1
            if L.get("kind") not in KINDS:
                err(f"{k}.layers[{li}]: kind={L.get('kind')}")
                continue
            if not isinstance(L.get("estimated"), bool):
                err(f"{k}.layers[{li}]: estimated 가 bool 아님")
            pos, ind = L.get("positions", []), L.get("indices", [])
            if len(pos) % 2 or len(ind) % 3 or not pos or not ind:
                err(f"{k}.layers[{li}]: positions/indices 길이 비정상")
                continue
            nv = len(pos) // 2
            if max(ind) >= nv or min(ind) < 0:
                err(f"{k}.layers[{li}]: 삼각형 인덱스 범위 밖")
                continue
            if not all(_fin(v) for v in pos):
                err(f"{k}.layers[{li}]: 좌표에 NaN/무한대")
                continue
            for i in range(0, len(pos), 2):
                lon, lat = pos[i], pos[i + 1]
                if not (SEOUL[1] <= lon <= SEOUL[3] and SEOUL[0] <= lat <= SEOUL[2]):
                    err(f"{k}.layers[{li}]: 서울 범위 밖 좌표 ({lon},{lat})"); break
                if not (w - mg <= lon <= e + mg and s - mg <= lat <= n + mg):
                    err(f"{k}.layers[{li}]: 타일 범위 밖 좌표 ({lon},{lat})"); break
            nt = len(ind) // 3
            ttri += nt
            for j in range(0, len(ind), 3):  # 퇴화(면적 0) 삼각형
                a_, b_, c_ = ind[j], ind[j + 1], ind[j + 2]
                cr = (pos[2 * b_] - pos[2 * a_]) * (pos[2 * c_ + 1] - pos[2 * a_ + 1]) - (pos[2 * c_] - pos[2 * a_]) * (pos[2 * b_ + 1] - pos[2 * a_ + 1])
                if abs(cr) < 1e-14 or a_ == b_ or b_ == c_ or a_ == c_:
                    total["degenerate"] += 1
            total["triangles"] += nt
        tris[k] = ttri
        info = []
        for bi, b in enumerate(t.get("buildings", [])):
            r = b.get("r", [])
            if len(r) < 6 or len(r) % 2 or not all(_fin(v) for v in r):
                err(f"{k}.buildings[{bi}]: 외곽 비정상"); continue
            if not (_fin(b.get("h")) and 0 < b["h"] <= 400):
                err(f"{k}.buildings[{bi}]: 높이 비정상 {b.get('h')}"); continue
            if b.get("e") not in (0, 1):
                err(f"{k}.buildings[{bi}]: e 가 0/1 아님"); continue
            if b.get("l") is not None and not (isinstance(b["l"], int) and b["l"] >= 1):
                err(f"{k}.buildings[{bi}]: l 비정상"); continue
            clon = sum(r[0::2]) / (len(r) // 2); clat = sum(r[1::2]) / (len(r) // 2)
            if not (w - mg <= clon <= e + mg and s - mg <= clat <= n + mg):
                err(f"{k}.buildings[{bi}]: 중심이 타일 밖"); continue
            total["buildings"] += 1; total["buildings_est"] += b["e"]
            info.append((clat, clon, _bld_tris(len(r) // 2)))
        blds_info[k] = info

    # 열기 시나리오: 각 타일 중심에서 반경 1km 로딩/반경 600m 건물 렌더 → 최악값
    worst = {"open_1km_gzip_bytes": 0, "total_tris": 0, "at": None}
    keyset = set(sizes)
    for k in keyset:
        ty, tx = (int(v) for v in k.split("_"))
        clat, clon = (ty + 0.5) * TILE_DEG, (tx + 0.5) * TILE_DEG
        mlng = M_PER_LAT * math.cos(math.radians(clat))
        near = [f"{y}_{x}" for y in range(math.floor((clat - LOAD_R / M_PER_LAT) / TILE_DEG), math.floor((clat + LOAD_R / M_PER_LAT) / TILE_DEG) + 1)
                for x in range(math.floor((clon - LOAD_R / mlng) / TILE_DEG), math.floor((clon + LOAD_R / mlng) / TILE_DEG) + 1) if f"{y}_{x}" in keyset]
        gz = sum(sizes[q][1] for q in near)
        bt = sum(tr for q in near for (la, lo, tr) in blds_info.get(q, [])
                 if math.hypot((lo - clon) * mlng, (la - clat) * M_PER_LAT) <= RENDER_R)
        tt = sum(tris.get(q, 0) for q in near) + bt
        if gz > worst["open_1km_gzip_bytes"]:
            worst["open_1km_gzip_bytes"], worst["at"] = gz, k
        worst["total_tris"] = max(worst["total_tris"], tt)
    gz_max = max((v[1] for v in sizes.values()), default=0)
    deg = total["degenerate"] / total["triangles"] if total["triangles"] else 0.0
    measured = {"open_1km_gzip_bytes": worst["open_1km_gzip_bytes"], "total_tris": worst["total_tris"],
                "tile_gzip_max": gz_max, "degenerate_ratio": round(deg, 5)}
    bud = {k: {"value": v, "limit": budget[k], "pass": v <= budget[k]} for k, v in measured.items()}
    area = total["area_est"] + total["area_meas"]
    stats = {
        "tiles": total["tiles"], "raw_bytes": sum(v[0] for v in sizes.values()), "gzip_bytes": sum(v[1] for v in sizes.values()),
        "triangles": total["triangles"], "buildings": total["buildings"],
        "buildings_height_estimated_ratio": round(total["buildings_est"] / total["buildings"], 3) if total["buildings"] else None,
        "surface_estimated_area_ratio": round(total["area_est"] / area, 3) if area else None,
        "worst_open_tile": worst["at"], "gu": sorted(idx.get("gu", {})),
    }
    return {"ok": not errors, "budget_ok": all(b["pass"] for b in bud.values()), "errors": errors, "warnings": warns,
            "budget": bud, "stats": stats}


def to_markdown(r: dict) -> str:
    s = r["stats"]
    L = ["## 바닥·건물 타일 검증 결과", "",
         f"- 무결성: **{'통과' if r['ok'] else '실패'}** (오류 {len(r['errors'])}, 경고 {len(r['warnings'])})",
         f"- 예산: **{'통과' if r.get('budget_ok') else '초과'}**"]
    if s:
        L += [f"- 타일 {s['tiles']}개, 원본 {s['raw_bytes']/1e6:.1f}MB / gzip {s['gzip_bytes']/1e6:.1f}MB, 바닥 삼각형 {s['triangles']:,}, 건물 {s['buildings']:,}동",
              f"- 건물 높이 추정 비율 {s['buildings_height_estimated_ratio']}, 바닥 폭 추정 면적 비율 {s['surface_estimated_area_ratio']}, 최악 위치 타일 {s['worst_open_tile']}"]
    L += ["", "| 예산 항목 | 값 | 한도 | 판정 |", "|---|---|---|---|"]
    for k, b in r["budget"].items():
        L.append(f"| {k} | {b['value']:,} | {b['limit']:,} | {'통과' if b['pass'] else '초과'} |")
    if r["errors"]:
        L += ["", "### 오류 (앞 20개)"] + [f"- {e}" for e in r["errors"][:20]]
    if r["warnings"]:
        L += ["", "### 경고 (앞 20개)"] + [f"- {w}" for w in r["warnings"][:20]]
    return "\n".join(L)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", nargs="?", type=Path, default=DEFAULT_DIR)
    ap.add_argument("--json", type=Path)
    ap.add_argument("--md", type=Path)
    a = ap.parse_args()
    r = audit(a.dir)
    md = to_markdown(r)
    print(md)
    if a.json:
        a.json.write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
    if a.md:
        a.md.write_text(md, encoding="utf-8")
    sys.exit(0 if r["ok"] and r["budget_ok"] else (1 if not r["ok"] else 2))


if __name__ == "__main__":
    main()
