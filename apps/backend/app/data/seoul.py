"""Canonical Seoul gu/dong and industry-code reference data.

Ported verbatim from the frontend's `lib/seoul.ts` so the backend can resolve
names/dong-counts without depending on the frontend bundle. Administrative
codes are placeholders pending a swap to the official 행정안전부 API (see
TODO in the frontend source) — tracked there, not duplicated here.
"""

from __future__ import annotations

SEOUL_GU: list[dict] = [
    {"code": "11680", "name": "강남구", "dongs": [
        {"code": "11680108", "name": "역삼동"}, {"code": "11680101", "name": "압구정동"},
        {"code": "11680105", "name": "청담동"}, {"code": "11680110", "name": "삼성동"},
        {"code": "11680113", "name": "대치동"}, {"code": "11680116", "name": "개포동"},
        {"code": "11680119", "name": "도곡동"}, {"code": "11680122", "name": "일원동"},
        {"code": "11680125", "name": "수서동"}, {"code": "11680103", "name": "논현동"},
    ]},
    {"code": "11740", "name": "강동구", "dongs": [
        {"code": "11740101", "name": "천호동"}, {"code": "11740104", "name": "성내동"},
        {"code": "11740107", "name": "둔촌동"}, {"code": "11740110", "name": "암사동"},
        {"code": "11740113", "name": "길동"}, {"code": "11740116", "name": "강일동"},
    ]},
    {"code": "11305", "name": "강북구", "dongs": [
        {"code": "11305101", "name": "미아동"}, {"code": "11305104", "name": "번동"},
        {"code": "11305107", "name": "수유동"}, {"code": "11305110", "name": "우이동"},
    ]},
    {"code": "11500", "name": "강서구", "dongs": [
        {"code": "11500101", "name": "화곡동"}, {"code": "11500104", "name": "가양동"},
        {"code": "11500107", "name": "마곡동"}, {"code": "11500110", "name": "등촌동"},
        {"code": "11500113", "name": "방화동"}, {"code": "11500116", "name": "염창동"},
    ]},
    {"code": "11620", "name": "관악구", "dongs": [
        {"code": "11620101", "name": "신림동"}, {"code": "11620104", "name": "봉천동"},
        {"code": "11620107", "name": "낙성대동"}, {"code": "11620110", "name": "남현동"},
    ]},
    {"code": "11215", "name": "광진구", "dongs": [
        {"code": "11215101", "name": "중곡동"}, {"code": "11215104", "name": "능동"},
        {"code": "11215107", "name": "구의동"}, {"code": "11215110", "name": "화양동"},
        {"code": "11215113", "name": "자양동"}, {"code": "11215116", "name": "군자동"},
    ]},
    {"code": "11530", "name": "구로구", "dongs": [
        {"code": "11530101", "name": "구로동"}, {"code": "11530104", "name": "신도림동"},
        {"code": "11530107", "name": "가리봉동"}, {"code": "11530110", "name": "오류동"},
        {"code": "11530113", "name": "개봉동"}, {"code": "11530116", "name": "항동"},
    ]},
    {"code": "11545", "name": "금천구", "dongs": [
        {"code": "11545101", "name": "가산동"}, {"code": "11545104", "name": "독산동"},
        {"code": "11545107", "name": "시흥동"},
    ]},
    {"code": "11350", "name": "노원구", "dongs": [
        {"code": "11350101", "name": "상계동"}, {"code": "11350104", "name": "중계동"},
        {"code": "11350107", "name": "하계동"}, {"code": "11350110", "name": "월계동"},
        {"code": "11350113", "name": "공릉동"},
    ]},
    {"code": "11320", "name": "도봉구", "dongs": [
        {"code": "11320101", "name": "창동"}, {"code": "11320104", "name": "방학동"},
        {"code": "11320107", "name": "쌍문동"}, {"code": "11320110", "name": "도봉동"},
    ]},
    {"code": "11230", "name": "동대문구", "dongs": [
        {"code": "11230101", "name": "회기동"}, {"code": "11230104", "name": "청량리동"},
        {"code": "11230107", "name": "이문동"}, {"code": "11230110", "name": "휘경동"},
        {"code": "11230113", "name": "답십리동"}, {"code": "11230116", "name": "전농동"},
    ]},
    {"code": "11590", "name": "동작구", "dongs": [
        {"code": "11590101", "name": "사당동"}, {"code": "11590104", "name": "노량진동"},
        {"code": "11590107", "name": "상도동"}, {"code": "11590110", "name": "본동"},
        {"code": "11590113", "name": "대방동"}, {"code": "11590116", "name": "흑석동"},
    ]},
    {"code": "11440", "name": "마포구", "dongs": [
        {"code": "11440101", "name": "서교동"}, {"code": "11440104", "name": "합정동"},
        {"code": "11440107", "name": "망원동"}, {"code": "11440110", "name": "상암동"},
        {"code": "11440113", "name": "공덕동"}, {"code": "11440116", "name": "아현동"},
        {"code": "11440119", "name": "성산동"},
    ]},
    {"code": "11410", "name": "서대문구", "dongs": [
        {"code": "11410101", "name": "신촌동"}, {"code": "11410104", "name": "홍은동"},
        {"code": "11410107", "name": "연희동"}, {"code": "11410110", "name": "남가좌동"},
        {"code": "11410113", "name": "북가좌동"},
    ]},
    {"code": "11650", "name": "서초구", "dongs": [
        {"code": "11650101", "name": "서초동"}, {"code": "11650104", "name": "반포동"},
        {"code": "11650107", "name": "양재동"}, {"code": "11650110", "name": "방배동"},
        {"code": "11650113", "name": "잠원동"},
    ]},
    {"code": "11200", "name": "성동구", "dongs": [
        {"code": "11200101", "name": "성수동"}, {"code": "11200104", "name": "왕십리동"},
        {"code": "11200107", "name": "금호동"}, {"code": "11200110", "name": "옥수동"},
        {"code": "11200113", "name": "행당동"},
    ]},
    {"code": "11290", "name": "성북구", "dongs": [
        {"code": "11290101", "name": "길음동"}, {"code": "11290104", "name": "정릉동"},
        {"code": "11290107", "name": "성북동"}, {"code": "11290110", "name": "종암동"},
        {"code": "11290113", "name": "석관동"}, {"code": "11290116", "name": "장위동"},
    ]},
    {"code": "11710", "name": "송파구", "dongs": [
        {"code": "11710101", "name": "잠실동"}, {"code": "11710104", "name": "방이동"},
        {"code": "11710107", "name": "풍납동"}, {"code": "11710110", "name": "가락동"},
        {"code": "11710113", "name": "문정동"}, {"code": "11710116", "name": "거여동"},
    ]},
    {"code": "11470", "name": "양천구", "dongs": [
        {"code": "11470101", "name": "목동"}, {"code": "11470104", "name": "신정동"},
        {"code": "11470107", "name": "신월동"},
    ]},
    {"code": "11560", "name": "영등포구", "dongs": [
        {"code": "11560101", "name": "여의도동"}, {"code": "11560104", "name": "영등포동"},
        {"code": "11560107", "name": "당산동"}, {"code": "11560110", "name": "문래동"},
        {"code": "11560113", "name": "양평동"}, {"code": "11560116", "name": "신길동"},
    ]},
    {"code": "11170", "name": "용산구", "dongs": [
        {"code": "11170101", "name": "이태원동"}, {"code": "11170104", "name": "한남동"},
        {"code": "11170107", "name": "후암동"}, {"code": "11170110", "name": "이촌동"},
        {"code": "11170113", "name": "용문동"}, {"code": "11170116", "name": "청파동"},
    ]},
    {"code": "11380", "name": "은평구", "dongs": [
        {"code": "11380101", "name": "응암동"}, {"code": "11380104", "name": "녹번동"},
        {"code": "11380107", "name": "불광동"}, {"code": "11380110", "name": "갈현동"},
        {"code": "11380113", "name": "수색동"}, {"code": "11380116", "name": "진관동"},
    ]},
    {"code": "11110", "name": "종로구", "dongs": [
        {"code": "11110101", "name": "사직동"}, {"code": "11110104", "name": "혜화동"},
        {"code": "11110107", "name": "창신동"}, {"code": "11110110", "name": "종로1·2·3·4가"},
        {"code": "11110113", "name": "경복궁·청와대"}, {"code": "11110116", "name": "부암동"},
    ]},
    {"code": "11140", "name": "중구", "dongs": [
        {"code": "11140101", "name": "명동"}, {"code": "11140104", "name": "충무로"},
        {"code": "11140107", "name": "을지로"}, {"code": "11140110", "name": "남대문로"},
        {"code": "11140113", "name": "회현동"}, {"code": "11140116", "name": "신당동"},
    ]},
    {"code": "11260", "name": "중랑구", "dongs": [
        {"code": "11260101", "name": "면목동"}, {"code": "11260104", "name": "망우동"},
        {"code": "11260107", "name": "중화동"}, {"code": "11260110", "name": "묵동"},
        {"code": "11260113", "name": "신내동"},
    ]},
]

INDUSTRY_CODES: list[dict] = [
    {"code": "ALL", "name": "전체"},
    {"code": "F45", "name": "음식점"},
    {"code": "G47", "name": "소매업"},
    {"code": "I56", "name": "카페·음료"},
    {"code": "S96", "name": "미용·뷰티"},
    {"code": "G4711", "name": "편의점"},
    {"code": "Q86", "name": "의료·약국"},
    {"code": "P85", "name": "교육·학원"},
    {"code": "K64", "name": "금융·보험"},
    {"code": "J62", "name": "IT·서비스"},
    {"code": "ETC", "name": "기타"},
]

_GU_BY_CODE = {g["code"]: g for g in SEOUL_GU}
_INDUSTRY_BY_CODE = {i["code"]: i for i in INDUSTRY_CODES}


def gu_name_of(gu_code: str) -> str:
    return _GU_BY_CODE.get(gu_code, {}).get("name", "")


def dong_name_of(gu_code: str, dong_code: str) -> str:
    gu = _GU_BY_CODE.get(gu_code)
    if not gu:
        return ""
    for dong in gu["dongs"]:
        if dong["code"] == dong_code:
            return dong["name"]
    return ""


def dong_count_of(gu_code: str) -> int:
    gu = _GU_BY_CODE.get(gu_code)
    return len(gu["dongs"]) if gu else 5


def industry_name_of(industry_code: str) -> str:
    return _INDUSTRY_BY_CODE.get(industry_code, {}).get("name", industry_code)


def all_dongs_of(gu_code: str) -> list[dict]:
    gu = _GU_BY_CODE.get(gu_code)
    return gu["dongs"] if gu else []


def all_gu_dong_pairs() -> list[tuple[str, str]]:
    return [(g["code"], d["code"]) for g in SEOUL_GU for d in g["dongs"]]
