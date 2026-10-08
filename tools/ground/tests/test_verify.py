import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

import verify_ground_output as vg

HERE = Path(__file__).resolve().parents[1]
SAMPLE = HERE.parents[1] / "apps/frontend/public/data/ground/_sample"
FIX = HERE / "fixtures" / "synthetic_osm.json"


@pytest.fixture()
def tiles(tmp_path):
    d = tmp_path / "t"
    shutil.copytree(SAMPLE, d)
    return d


def edit(d, key, fn):
    p = d / f"{key}.json"
    t = json.loads(p.read_text(encoding="utf-8"))
    fn(t)
    p.write_text(json.dumps(t), encoding="utf-8")


def test_sample_passes(tiles):
    r = vg.audit(tiles)
    assert r["ok"] and r["budget_ok"], r["errors"]
    assert r["stats"]["buildings"] == 48 and r["stats"]["tiles"] == 5
    assert any("synthetic" in w for w in r["warnings"])


def test_missing_index_and_missing_tile(tmp_path, tiles):
    assert not vg.audit(tmp_path / "nope")["ok"]
    (tiles / "3754_12705.json").unlink()
    r = vg.audit(tiles)
    assert not r["ok"] and any("파일 없음" in e for e in r["errors"])


def test_orphan_tile_is_warning(tiles):
    shutil.copy(tiles / "3754_12705.json", tiles / "3799_12799.json")
    r = vg.audit(tiles)
    assert r["ok"] and any("고아" in w for w in r["warnings"])


@pytest.mark.parametrize("mutate,needle", [
    (lambda t: t["layers"][0]["indices"].__setitem__(0, 10**6), "인덱스 범위"),
    (lambda t: t["layers"][0]["positions"].__setitem__(0, 128.5), "서울 범위"),
    (lambda t: t["layers"][0]["positions"].__setitem__(0, 127.07), "타일 범위"),
    (lambda t: t["layers"][0].__setitem__("kind", "river"), "kind"),
    (lambda t: t["layers"][0]["indices"].pop(), "길이"),
    (lambda t: t["buildings"][0].__setitem__("h", -3), "높이"),
    (lambda t: t["buildings"][0].__setitem__("e", 2), "0/1"),
    (lambda t: t.__setitem__("tile", "1_1"), "불일치"),
])
def test_corruptions_are_caught(tiles, mutate, needle):
    edit(tiles, "3754_12705", mutate)
    r = vg.audit(tiles)
    assert not r["ok"] and any(needle in e for e in r["errors"]), r["errors"]


def test_nan_coordinate_is_caught(tiles):
    p = tiles / "3754_12705.json"
    p.write_text(p.read_text(encoding="utf-8").replace('"positions":[', '"positions":[NaN,', 1), encoding="utf-8")
    r = vg.audit(tiles)
    assert not r["ok"]


def test_budget_failure_is_separate_from_errors(tiles):
    r = vg.audit(tiles, {"tile_gzip_max": 10})
    assert r["ok"] and not r["budget_ok"] and not r["budget"]["tile_gzip_max"]["pass"]


def test_run_all_end_to_end_and_failure_paths(tmp_path):
    out, rep = tmp_path / "out", tmp_path / "r.md"
    base = [sys.executable, str(HERE / "run_all.py"), "--out", str(out), "--report", str(rep)]
    ok = subprocess.run(base + ["--gu", "seongdong", "--osm-json", str(FIX), "--synthetic", "--clean"], capture_output=True, text=True)
    assert ok.returncode == 0, ok.stdout + ok.stderr
    text = rep.read_text(encoding="utf-8")
    assert "## 1. 생성 단계" in text and "## 2. 검증 단계" in text and "결과 코드: 0" in text
    # 알 수 없는 구 → 생성 실패(3), 보고서는 남는다
    bad = subprocess.run(base + ["--gu", "atlantis"], capture_output=True, text=True)
    assert bad.returncode == 3 and "생성 단계 실패" in rep.read_text(encoding="utf-8")
    # 손상된 타일 → 무결성 실패(1)
    edit(out, "3754_12705", lambda t: t["layers"][0]["indices"].__setitem__(0, 10**6))
    r = vg.audit(out)
    assert not r["ok"]
