import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import population_pivot as pp


def row(d, h, v, z="A"):
    return {"STDR_DE_ID": d, "TMZON_PD_SE": f"{h:02d}", "ADSTRD_CODE_SE": z, "TOT_LVPOP_CO": v}


def test_weekday_mean_over_dates_and_zone_sum_first():
    # 2026-06-01, 06-08 = 월요일. 같은 날짜·시간 두 구역은 먼저 합산한 뒤 날짜 평균
    rows = [row("20260601", 9, 100, "A"), row("20260601", 9, 50, "B"),   # 합 150
            row("20260608", 9, 250, "A"), row("20260608", 9, 50, "B"),   # 합 300 → 평균 225
            row("20260602", 9, 70, "A")]                                  # 화요일
    t = pp.pivot_weekday_hour(rows)
    assert t[0][9] == pytest.approx(225) and t[1][9] == pytest.approx(70)
    assert t[2][9] is None                                                 # 데이터 없는 칸
    only_a = pp.pivot_weekday_hour(rows, zones=["A"])
    assert only_a[0][9] == pytest.approx((100 + 250) / 2)


def test_bad_hour_rejected():
    with pytest.raises(ValueError):
        pp.pivot_weekday_hour([row("20260601", 24, 1)])


def test_bands_peak_and_weekend_ratio():
    t = pp.pivot_weekday_hour(pp.synthetic_rows("office"))
    b = pp.band_table(t)
    assert len(b) == 7 and len(b[0]) == 6
    p = pp.peak(t)
    assert p["weekday"] in "월화수목금" and p["hour"] in (18, 19)       # 출퇴근형: 평일 저녁 피크
    r = pp.weekday_vs_weekend(t)
    assert r["weekend_to_weekday"] < 0.6
    f = pp.weekday_vs_weekend(pp.pivot_weekday_hour(pp.synthetic_rows("food")))
    assert f["weekend_to_weekday"] > 0.9                                   # 먹자형: 주말도 높음
    assert pp.peak(pp.pivot_weekday_hour(pp.synthetic_rows("food")))["hour"] in (19, 20)
