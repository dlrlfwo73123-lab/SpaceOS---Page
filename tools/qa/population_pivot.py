"""시간대별 인구 행(row) → 요일 × 시간대 표. 공실이 속한 구역의 '언제 사람이 많은가'를 보는 집계.

입력 행은 서울 열린데이터광장 '생활인구' 계열에서 흔히 쓰는 필드명(확인 필요: 데이터셋 정의서)을 기본값으로 한다.
  기준일 STDR_DE_ID(YYYYMMDD), 시간대 TMZON_PD_SE(00~23), 구역 코드 ADSTRD_CODE_SE, 값 TOT_LVPOP_CO
같은 (날짜, 시간) 에 여러 구역 행이 있으면 먼저 합산(구역 여러 개를 하나의 '공실 주변 구역'으로 보는 경우)한 뒤,
같은 요일·시간의 날짜들을 평균한다.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date

WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
BANDS = [("00-06", range(0, 6)), ("06-11", range(6, 11)), ("11-14", range(11, 14)),
         ("14-17", range(14, 17)), ("17-21", range(17, 21)), ("21-24", range(21, 24))]


def pivot_weekday_hour(rows, date_key="STDR_DE_ID", hour_key="TMZON_PD_SE", value_key="TOT_LVPOP_CO",
                       zone_key="ADSTRD_CODE_SE", zones=None) -> list[list[float | None]]:
    """7(월~일) × 24(0~23시) 평균 표. 데이터가 없는 칸은 None. zones 를 주면 해당 구역 행만 사용."""
    per_dt: dict[tuple[str, int], float] = defaultdict(float)
    for r in rows:
        if zones is not None and str(r.get(zone_key)) not in {str(z) for z in zones}:
            continue
        h = int(r[hour_key])
        if not 0 <= h <= 23:
            raise ValueError(f"시간대 범위 오류: {h}")
        per_dt[(str(r[date_key]), h)] += float(r[value_key])
    acc: dict[tuple[int, int], list[float]] = defaultdict(list)
    for (d, h), v in per_dt.items():
        wd = date(int(d[:4]), int(d[4:6]), int(d[6:8])).weekday()
        acc[(wd, h)].append(v)
    return [[(sum(acc[(w, h)]) / len(acc[(w, h)])) if acc.get((w, h)) else None for h in range(24)] for w in range(7)]


def band_table(table) -> list[list[float | None]]:
    """24시간 표 → 6개 시간대 구간 평균 (우리마을가게식 구간: 00-06, 06-11, 11-14, 14-17, 17-21, 21-24)."""
    out = []
    for row in table:
        line = []
        for _, hrs in BANDS:
            vals = [row[h] for h in hrs if row[h] is not None]
            line.append(sum(vals) / len(vals) if vals else None)
        out.append(line)
    return out


def peak(table) -> dict:
    best = max(((v, w, h) for w, row in enumerate(table) for h, v in enumerate(row) if v is not None), default=None)
    return {"weekday": WEEKDAYS[best[1]], "hour": best[2], "value": round(best[0])} if best else {}


def weekday_vs_weekend(table) -> dict:
    """평일(월~금)·주말(토·일) 하루 평균 인구와 비율"""
    def day_mean(rows):
        vals = [sum(v for v in r if v is not None) / 24 for r in rows]
        return sum(vals) / len(vals)
    wk, we = day_mean(table[:5]), day_mean(table[5:])
    return {"weekday_mean": round(wk), "weekend_mean": round(we), "weekend_to_weekday": round(we / wk, 2) if wk else None}


def synthetic_rows(kind: str, weeks: int = 8, zone="SYN-ZONE"):
    """합성 예시(실제 데이터 아님). kind: 'office'(평일 출퇴근형) | 'food'(저녁·주말 먹자형)"""
    import math
    rows = []
    start = date(2026, 6, 1)  # 월요일
    for d in range(weeks * 7):
        day = date.fromordinal(start.toordinal() + d)
        wd = day.weekday()
        for h in range(24):
            if kind == "office":
                base = 1200 + (4800 * math.exp(-((h - 9) ** 2) / 6) + 4200 * math.exp(-((h - 13) ** 2) / 5) + 6400 * math.exp(-((h - 18.5) ** 2) / 5)) * (1.0 if wd < 5 else 0.28)
            else:
                base = 1500 + (1600 * math.exp(-((h - 12.5) ** 2) / 4) + 7200 * math.exp(-((h - 19.5) ** 2) / 6) + 3800 * math.exp(-((h - 22.5) ** 2) / 4)) * (1.0 if wd < 4 else 1.45 if wd < 6 else 0.85)
            wobble = 1 + 0.04 * math.sin(d * 1.3 + h)
            rows.append({"STDR_DE_ID": day.strftime("%Y%m%d"), "TMZON_PD_SE": f"{h:02d}", "ADSTRD_CODE_SE": zone, "TOT_LVPOP_CO": base * wobble})
    return rows
