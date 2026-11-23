/* PlaceOS 공실 보고서 공용 스크립트 — 말풍선 · 상권 표 정렬 · 층별 목록(거르기 · 이유 · CSV).
   두 보고서(전체 분류 · 건물주 등록 구분)가 같은 코드를 쓴다. build_report.py · owner_split.py 가 HTML 안에 넣는다.
   opts.classes : 보일 등급 번호(0 여력 있음 · 1 가능·얇음 · 2 조건부 · 3 어려움)
   P.owner      : 건물주 직접 등록 매물(있으면 출처 거르기 · 배지 · 조건이 붙는다) */
window.VacancyReport = function(P, opts){
"use strict";
opts = opts || {};
var M = P.meta, ROWS = P.rows, HUBS = P.hubs;
var CL = [
  {k:"A1", name:"창업 여력 있음", icon:"✓"},
  {k:"A2", name:"창업 가능 · 여력 얇음", icon:"!"},
  {k:"B",  name:"조건부 · 확인 필요", icon:"?"},
  {k:"C",  name:"창업 어려움", icon:"✕"}
];
var IND = {cafe:"카페·디저트", restaurant:"음식점·술집", convenience:"소매(편의점·옷·잡화)", beauty:"미용·네일", education:"학원·교육", fitness:"운동(체력단련)"};
var IND_SHORT = {cafe:"카페", restaurant:"음식점", convenience:"소매", beauty:"미용", education:"학원", fitness:"운동"};
var TIER = {premium:"고급화", value:"가성비", factory:"공장제"};
var HO = {1:"단독주택",3:"제1종 근린생활시설",4:"제2종 근린생활시설",5:"문화 및 집회시설",6:"종교시설",7:"판매시설",9:"의료시설",10:"교육연구시설",11:"노유자시설",13:"운동시설",14:"업무시설",15:"숙박시설",16:"위락시설",19:"위험물 저장 및 처리 시설",20:"자동차 관련 시설",21:"동물 및 식물 관련 시설",24:"방송통신시설",27:"관광 휴게시설"};
var HO_SHORT = {3:"1종 근생",4:"2종 근생"};
var RS = P.reasons;
var RTXT = {
  L_OPEN:"법·용도 열림", L_PUBLIC:"공공·기반 시설", L_USE_CHANGE:"용도변경 필요", L_ZONE_BLOCK:"용도지역 금지",
  L_ZONE_MISSING:"행위제한 미수집", L_OTHER_MISSING:"지역지구 미수집", L_PARCEL_MISSING:"필지 자료 없음", L_SALES:"판매시설 층",
  E_PLUS:"수지 서울 평균 이상", E_THIN:"수지 얇음", E_UPPER_ONLY:"상층 임대료로만 흑자", E_NO:"1층 수지 적자", E_NA:"수지 자료 없음",
  P_LARGE:"300㎡ 이상", P_EMPTY_BLD:"건물 전체 공실", P_UPPER:"3층 이상"
};
var HARD = {L_PUBLIC:1, L_USE_CHANGE:1, L_ZONE_BLOCK:1, E_NO:1};
var SOFT = {L_ZONE_MISSING:1, L_OTHER_MISSING:1, L_PARCEL_MISSING:1, L_SALES:1, E_UPPER_ONLY:1, E_NA:1, P_LARGE:1, P_EMPTY_BLD:1};
function fmt(n){ return Number(n).toLocaleString("ko-KR"); }
function pct(x, d){ return (x*100).toFixed(d==null?1:d) + "%"; }
function has(mask, i){ return (mask >> i) & 1; }
function listMask(mask, keys){ var o=[]; for (var i=0;i<keys.length;i++) if (has(mask,i)) o.push(keys[i]); return o; }
function el(tag, cls, text){ var e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
function badge(ci){
  var b = el("span","badge c"+ci); var s = el("i","sw",CL[ci].icon); s.setAttribute("aria-hidden","true");
  b.appendChild(s); b.appendChild(document.createTextNode(CL[ci].name)); return b;
}

/* ── 말풍선: data-tip 이 있는 요소에 마우스·키보드 초점 ── */
var tip = document.getElementById("tip");
function showTip(t, x, y){
  tip.textContent = "";
  var parts = String(t).split("\n");
  var b = el("b", null, parts[0]); tip.appendChild(b);
  for (var i=1;i<parts.length;i++){ tip.appendChild(document.createElement("br")); tip.appendChild(document.createTextNode(parts[i])); }
  tip.classList.add("on");
  var w = tip.offsetWidth, h = tip.offsetHeight;
  var left = Math.min(Math.max(8, x + 12), window.innerWidth - w - 8);
  var top = y - h - 12; if (top < 8) top = y + 16;
  tip.style.left = left + "px"; tip.style.top = top + "px";
}
function hideTip(){ tip.classList.remove("on"); }
document.addEventListener("pointermove", function(e){
  var t = e.target.closest && e.target.closest("[data-tip]");
  if (t) showTip(t.getAttribute("data-tip"), e.clientX, e.clientY); else hideTip();
});
document.addEventListener("focusin", function(e){
  var t = e.target.closest && e.target.closest("[data-tip]");
  if (t){ var r = t.getBoundingClientRect(); showTip(t.getAttribute("data-tip"), r.left + r.width/2, r.top); }
});
document.addEventListener("focusout", hideTip);
window.addEventListener("scroll", hideTip, {passive:true});

/* ── 상권 표 정렬 ── */
(function(){
  var table = document.getElementById("hubTable"); if (!table) return;
  var tbody = table.tBodies[0];
  var btns = table.querySelectorAll("th button");
  var state = {k:null, dir:-1};
  function val(tr, k){
    if (k === "name") return tr.getAttribute("data-name");
    return Number(tr.getAttribute("data-" + k));
  }
  btns.forEach(function(b){
    b.addEventListener("click", function(){
      var k = b.getAttribute("data-k");
      state.dir = (state.k === k) ? -state.dir : (k === "name" ? 1 : -1); state.k = k;
      btns.forEach(function(x){ x.removeAttribute("aria-sort"); });
      b.setAttribute("aria-sort", state.dir > 0 ? "ascending" : "descending");
      var trs = Array.prototype.slice.call(tbody.rows);
      trs.sort(function(a, c){
        var va = val(a,k), vc = val(c,k);
        if (k === "name") return state.dir * va.localeCompare(vc, "ko");
        return state.dir * (va - vc);
      });
      trs.forEach(function(tr){ tbody.appendChild(tr); });
    });
  });
})();

/* ── 층별 목록 ── */
var HUB_NAME = HUBS.map(function(h){ return h[1]; });
var HUB_GU = HUBS.map(function(h){ return h[2]; });
var HUB_SLUG = HUBS.map(function(h){ return h[0]; });
var FF = M.floorFactor || {};
function floorFactor(f){
  var key = f === 1 ? "1F" : f === 2 ? "2F" : f === 3 ? "3F" : "4F+";
  return FF[key] != null ? FF[key] : null;
}
function hoLabel(ho){ return ho ? (HO[ho] || ("별표1 제" + ho + "호")) : "1·2종 미상(코드 없음)"; }
function marginTxt(bp){
  if (bp == null) return "자료 부족";
  var v = bp/100, a = Math.abs(v);
  return (bp > 0 ? "+" : "") + v.toFixed(a > 0 && a < 0.1 ? 2 : 1) + "%";
}
function tierList(mask){ return listMask(mask, P.tiers).map(function(t){ return TIER[t]; }).join("·"); }
function indList(mask, short){ return listMask(mask, P.ind).map(function(k){ return short ? IND_SHORT[k] : IND[k]; }).join(" · "); }

function needTxt(r){
  if (r[28] == null) return "";
  var t = TIER[P.tiers[r[29]]];
  if (r[28] < 5) return " 가장 가까운 " + t + "는 사실상 본전(월 순익 0 근처)입니다.";
  return " 본전이려면 가장 가까운 " + t + " 기준으로 추정 매출보다 " + (r[28]/100).toFixed(1) + "% 더 팔아야 합니다.";
}
function needShort(r){
  if (r[28] == null) return "";
  return r[28] < 5 ? " (" + TIER[P.tiers[r[29]]] + " 사실상 본전)" : " (본전까지 매출 +" + (r[28]/100).toFixed(1) + "%)";
}
function econSummary(r){
  var rm = r[7];
  if (has(rm, RS.indexOf("E_PLUS"))) return "1층 기준 서울 평균 이상 (" + tierList(r[12]) + ")";
  if (has(rm, RS.indexOf("E_THIN"))) return "1층 기준 흑자 · 서울 평균 미만 (최고 " + marginTxt(r[16]) + ")";
  if (has(rm, RS.indexOf("E_UPPER_ONLY"))) return "1층 기준 적자 · 이 층 임대료로만 흑자";
  if (has(rm, RS.indexOf("E_NO"))) return "1층 기준 세 가격대 모두 적자" + needShort(r);
  return "수지 자료 없음";
}
function reasonsOf(r){
  var out = [], rm = r[7], purps = P.purps[r[4]], ho = r[5], zone = P.zones[r[22]], f = r[2], area = r[3];
  var kp = M.kosisProfit;
  function push(code, text){ out.push({code:code, text:text}); }
  if (has(rm, RS.indexOf("L_OPEN"))){
    var t = "대장 용도 「" + purps + "」(" + hoLabel(ho) + ") · 용도지역 " + zone + " — 일반 창업 6업종 중 " + indList(r[8]) + "이(가) 같은 건축법 분류로 들어갈 수 있습니다.";
    if (r[10]) t += " 세부용도까지 같은 업종: " + indList(r[10]) + "(그 밖의 업종은 대장 기재내용 변경 확인).";
    var ck = [];
    if (r[11] & 4) ck.push("지구단위계획 등 다른 지역지구의 허용·불허 용도");
    if (r[11] & 2) ck.push("용도지역의 조례 조건");
    if (ck.length) t += " 구청 확인: " + ck.join(", ") + ".";
    push("L_OPEN", t);
  }
  if (has(rm, RS.indexOf("L_PUBLIC"))) push("L_PUBLIC", "대장 용도 「" + purps + "」 — 공공·기반 시설입니다. 상가정보·인허가에 잡히지 않아 「빈 층」으로 남았을 가능성이 커서 임대 매물로 보기 어렵습니다.");
  if (has(rm, RS.indexOf("L_USE_CHANGE"))) push("L_USE_CHANGE", "대장 용도 「" + purps + "」(" + hoLabel(ho) + ") — 일반 창업 6업종 모두 건축법 분류(별표1 호)가 달라 용도변경(신고·허가)이 필요합니다. 주차·정화조·피난 기준이 같이 바뀔 수 있습니다.");
  if (has(rm, RS.indexOf("L_ZONE_BLOCK"))) push("L_ZONE_BLOCK", "용도지역 " + zone + " — 대장상 들어갈 수 있는 업종의 행위가 토지이음 행위제한에 「금지」로 나옵니다.");
  if (has(rm, RS.indexOf("L_ZONE_MISSING"))) push("L_ZONE_MISSING", (HUB_GU[r[0]] || "이 구") + " 필지의 토지이음 행위제한을 아직 받지 않았습니다. 대장 용도 「" + purps + "」(" + hoLabel(ho) + ")로는 " + indList(r[9]) + " 분류라, 행위제한을 받으면 다시 나뉩니다.");
  if (has(rm, RS.indexOf("L_OTHER_MISSING"))) push("L_OTHER_MISSING", "용도지역 밖 지역지구의 행위제한을 아직 받지 않았습니다.");
  if (has(rm, RS.indexOf("L_PARCEL_MISSING"))) push("L_PARCEL_MISSING", "이 필지의 용도지역 자료가 없습니다.");
  if (has(rm, RS.indexOf("L_SALES"))) push("L_SALES", "대장 용도 「" + purps + "」(판매시설) — PlaceOS 입점 점검은 소매점(1종 근생)과 분류가 달라 용도변경 필요로 보지만, 판매시설 안의 상점이면 그대로 쓸 수 있는 경우가 있어 구청 확인으로 둡니다.");
  var m1 = r[26], mh = r[27];
  var mtxt = P.tiers.map(function(t,i){ return TIER[t] + " " + marginTxt(m1[i]); }).join(" · ");
  var base = P.tiers.map(function(t){ return TIER[t] + " " + pct(kp[t]); }).join(" · ");
  if (has(rm, RS.indexOf("E_PLUS"))) push("E_PLUS", "1층 기준 순익률 " + mtxt + " — " + tierList(r[12]) + "이(가) 서울 같은 가격대 평균 영업이익률(" + base + ") 이상입니다. 서울 평균 가게보다 임대료 부담이 가볍다는 뜻입니다.");
  if (has(rm, RS.indexOf("E_THIN"))) push("E_THIN", "1층 기준 순익률 " + mtxt + " — 흑자는 나지만 서울 같은 가격대 평균(" + base + ")보다 얇습니다. 임대료 부담이 서울 평균보다 커서 객단가·회전을 더 따져야 합니다.");
  if (has(rm, RS.indexOf("E_UPPER_ONLY"))){
    var ff = floorFactor(f);
    push("E_UPPER_ONLY", "1층 임대료로는 세 가격대 모두 적자(" + mtxt + ")입니다." + needTxt(r) + " 이 층 임대료(층 계수 " + (ff==null?"-":ff) + ")를 넣으면 " + tierList(r[14]) + " 흑자지만 매출은 1층 기준이라, 상층 매출이 버텨 줘야 합니다.");
  }
  if (has(rm, RS.indexOf("E_NO"))) push("E_NO", "1층 기준 세 가격대 모두 월 순익이 0 이하입니다(" + mtxt + "). 이 상권은 1층 임대료에 비해 추정 매출이 모자랍니다." + needTxt(r));
  if (has(rm, RS.indexOf("E_NA"))) push("E_NA", "이 상권은 실측으로 계산할 수 있는 가격대가 없어 수지를 계산하지 않았습니다.");
  if (has(rm, RS.indexOf("P_LARGE"))) push("P_LARGE", "면적 " + fmt(area) + "㎡ — 300㎡ 이상입니다(휴게음식점이 1·2종 근생으로 갈리는 기준이고, 공정위 가맹점 중앙 점포 면적 56~69㎡의 4배 이상). 층 전체 면적이라 호실로 나뉘어 임대되는지 확인하세요.");
  if (has(rm, RS.indexOf("P_EMPTY_BLD"))) push("P_EMPTY_BLD", "이 건물 상업층 " + r[25] + "개가 모두 비어 있습니다. 신축 입주 전인지, 리모델링·재건축·매각 중인지부터 확인하세요.");
  if (has(rm, RS.indexOf("P_UPPER"))) push("P_UPPER", f + "층 — 찾아오는 업종(학원·미용·운동)이 주로 맞습니다. 음식점·카페·소매는 엘리베이터·간판 노출을 확인하세요(등급에는 반영하지 않음).");
  return out;
}

var SHOW = opts.classes || [0,1,2,3];
var OWN = P.owner || null;   /* 건물주 직접 등록 매물(공개 API · 게시 중 + 소유자 확인). 행의 r[30] 이 그 번호(-1 = 없음) */
var state = {cls:[0,0,0,0], src:[1,1], hub:"", floor:"", ind:"", reason:"", sort:(document.getElementById("fSort") || {}).value || "cls", q:"", page:0};
SHOW.forEach(function(i){ state.cls[i] = 1; });
var PER = 50, filtered = [];
var chipsBox = document.getElementById("clsChips");
CL.forEach(function(c, i){
  if (SHOW.indexOf(i) < 0) return;
  var b = el("button","chip c"+i); b.type = "button"; b.setAttribute("aria-pressed","true");
  var s = el("i","sw",c.icon); s.setAttribute("aria-hidden","true"); b.appendChild(s);
  b.appendChild(document.createTextNode(c.name + " "));
  b.appendChild(el("small", null, fmt(M.classCounts[i])));
  b.addEventListener("click", function(){
    state.cls[i] = state.cls[i] ? 0 : 1; b.setAttribute("aria-pressed", state.cls[i] ? "true" : "false"); state.page = 0; run();
  });
  chipsBox.appendChild(b);
});
function isOwn(r){ return OWN != null && r[30] != null && r[30] >= 0; }
function srcBadge(own){
  var b = el("span","badge src " + (own ? "own" : "data"));
  var s = el("i","sw", own ? "⌂" : "▦"); s.setAttribute("aria-hidden","true"); b.appendChild(s);
  b.appendChild(document.createTextNode(own ? "건물주 직접 등록" : "자료로 찾은 빈 층")); return b;
}
var srcBox = document.getElementById("srcChips");
if (srcBox && OWN){
  [["건물주 직접 등록", "own", "⌂"], ["자료로 찾은 빈 층", "data", "▦"]].forEach(function(x, i){
    var b = el("button","chip src " + x[1]); b.type = "button"; b.setAttribute("aria-pressed","true");
    var s = el("i","sw",x[2]); s.setAttribute("aria-hidden","true"); b.appendChild(s);
    b.appendChild(document.createTextNode(x[0] + " ")); b.appendChild(el("small", null, fmt(M.srcCounts[i])));
    b.addEventListener("click", function(){
      state.src[i] = state.src[i] ? 0 : 1; b.setAttribute("aria-pressed", state.src[i] ? "true" : "false"); state.page = 0; run();
    });
    srcBox.appendChild(b);
  });
}
var fHub = document.getElementById("fHub");
HUBS.map(function(h,i){ return [h[2] + " · " + h[1], i]; }).sort(function(a,b){ return a[0].localeCompare(b[0],"ko"); })
  .forEach(function(x){ if (!HUBS[x[1]][5]) return; var o = el("option", null, x[0] + " (" + fmt(HUBS[x[1]][5]) + ")"); o.value = String(x[1]); fHub.appendChild(o); });
var fInd = document.getElementById("fInd");
P.ind.forEach(function(k,i){ var o = el("option", null, "들어갈 수 있는 업종: " + IND[k]); o.value = String(i); fInd.appendChild(o); });
var fReason = document.getElementById("fReason");
RS.forEach(function(k,i){
  if (!M.reasonCounts[k]) return;
  var o = el("option", null, "이유: " + RTXT[k] + " (" + fmt(M.reasonCounts[k]) + ")"); o.value = String(i); fReason.appendChild(o);
});
function bind(id, key, num){
  var e = document.getElementById(id);
  e.addEventListener(id === "fQ" ? "input" : "change", function(){ state[key] = e.value; state.page = 0; run(); });
}
bind("fHub","hub"); bind("fFloor","floor"); bind("fInd","ind"); bind("fReason","reason"); bind("fSort","sort"); bind("fQ","q");
document.getElementById("prevBtn").addEventListener("click", function(){ if (state.page>0){ state.page--; render(); scrollList(); } });
document.getElementById("nextBtn").addEventListener("click", function(){ if ((state.page+1)*PER < filtered.length){ state.page++; render(); scrollList(); } });
function scrollList(){ document.getElementById("floors").scrollIntoView({behavior:"smooth", block:"start"}); }

function run(){
  var q = state.q.trim().toLowerCase();
  var hub = state.hub === "" ? -1 : Number(state.hub);
  var ind = state.ind === "" ? -1 : Number(state.ind);
  var rsn = state.reason === "" ? -1 : Number(state.reason);
  filtered = [];
  for (var i=0;i<ROWS.length;i++){
    var r = ROWS[i];
    if (!state.cls[r[6]]) continue;
    if (OWN){ var own = isOwn(r); if (own && !state.src[0]) continue; if (!own && !state.src[1]) continue; }
    if (hub >= 0 && r[0] !== hub) continue;
    if (state.floor === "1" && r[2] !== 1) continue;
    if (state.floor === "2" && r[2] !== 2) continue;
    if (state.floor === "3" && r[2] < 3) continue;
    if (ind >= 0 && !has(r[8] || r[9], ind)) continue;
    if (rsn >= 0 && !has(r[7], rsn)) continue;
    if (q){
      var hay = (r[1] + " " + P.purps[r[4]] + " " + HUB_NAME[r[0]]).toLowerCase();
      if (hay.indexOf(q) < 0) continue;
    }
    filtered.push(r);
  }
  var s = state.sort;
  filtered.sort(function(a,b){
    if (s === "margin") return (b[16]==null?-1e9:b[16]) - (a[16]==null?-1e9:a[16]) || a[6]-b[6];
    if (s === "areaAsc") return a[3]-b[3];
    if (s === "areaDesc") return b[3]-a[3];
    if (s === "floor") return a[2]-b[2] || a[6]-b[6];
    if (s === "owner") return (isOwn(b)?1:0) - (isOwn(a)?1:0) || a[6]-b[6] || HUB_NAME[a[0]].localeCompare(HUB_NAME[b[0]],"ko") || a[2]-b[2];
    return a[6]-b[6] || HUB_NAME[a[0]].localeCompare(HUB_NAME[b[0]],"ko") || a[2]-b[2] || a[3]-b[3];
  });
  render();
}
function won(v){ return v == null ? "-" : fmt(v) + "만원"; }
function termsTxt(o){
  var t = [];
  if (o.unit_label) t.push("호실 " + o.unit_label);
  if (o.area_m2) t.push("면적 " + fmt(o.area_m2) + "㎡");
  t.push(o.deal_label || "임대");
  t.push("보증금 " + won(o.deposit_manwon) + " · 월세 " + won(o.monthly_rent_manwon) + (o.maintenance_manwon ? " · 관리비 " + won(o.maintenance_manwon) : ""));
  if (o.rent_free_months) t.push("렌트프리 " + o.rent_free_months + "개월");
  if (o.available_from) t.push("입주 가능 " + o.available_from);
  if (o.vacant_since) t.push(o.vacant_since + "부터 비어 있음");
  if (o.popup_min_days || o.popup_max_days) t.push("팝업 " + (o.popup_min_days || "?") + "~" + (o.popup_max_days || "?") + "일" + (o.popup_daily_manwon ? " · 하루 " + won(o.popup_daily_manwon) : ""));
  return t.join(" · ");
}
function ownersOf(r){ return isOwn(r) ? (P.ownerGroups[r[30]] || []).map(function(i){ return OWN[i]; }) : []; }
function ownerBlock(r){
  var box = el("div","owner-box" + (isOwn(r) ? " on" : ""));
  if (isOwn(r)){
    var os = ownersOf(r);
    box.appendChild(el("b", null, "건물주가 직접 올린 매물 " + os.length + "건 — 소유자 확인 · 게시 중"));
    os.forEach(function(o){
      var pp = el("p", null, (o.title ? o.title + " — " : "") + termsTxt(o) + " ");
      var a = el("a", null, "PlaceOS에서 매물 보기"); a.href = "https://placeos.co.kr/#/listing/" + encodeURIComponent(o.id); a.target = "_blank"; a.rel = "noopener";
      pp.appendChild(a); box.appendChild(pp);
    });
    box.appendChild(el("p", null, "월세는 건물주가 적은 값입니다. 위 등급의 수지는 R-ONE 추정 임대료 기준이라, 이 조건으로 다시 계산해야 합니다(PlaceOS Posting 「이 조건이면 얼마나 팔아야 하나」)."));
  } else {
    box.appendChild(el("b", null, "건물주 등록 없음 — PlaceOS가 자료로 찾은 빈 층"));
    box.appendChild(el("p", null, "건축물대장 층별개요 · 상가정보 · 인허가를 대조해 비었다고 본 층입니다. 건물주 확인 전이라 실제로 임대 중인지, 월세가 얼마인지는 모릅니다(아래 수지의 임대료는 R-ONE 1층 임대료 × 층 계수 추정). 같은 건물 같은 층을 건물주가 올리면 여기에 조건이 붙습니다."));
  }
  return box;
}
function render(){
  var list = document.getElementById("flist"); list.textContent = "";
  var n = filtered.length, pages = Math.max(1, Math.ceil(n/PER));
  if (state.page >= pages) state.page = pages-1;
  document.getElementById("resCount").textContent = "걸러진 빈 층 " + fmt(n) + "개" + (n ? " · " + fmt(state.page*PER+1) + "–" + fmt(Math.min(n,(state.page+1)*PER)) + "번째" : "");
  document.getElementById("pageInfo").textContent = (state.page+1) + " / " + pages + " 쪽";
  document.getElementById("prevBtn").disabled = state.page === 0;
  document.getElementById("nextBtn").disabled = (state.page+1)*PER >= n;
  document.getElementById("csvBtn").disabled = n === 0;
  if (!n){
    var msg = "조건에 맞는 빈 층이 없습니다. 거르기를 줄여 보세요.";
    if (OWN && !state.src[1] && M.ownerEmptyNote) msg = M.ownerEmptyNote;
    list.appendChild(el("li","empty",msg)); return;
  }
  var slice = filtered.slice(state.page*PER, (state.page+1)*PER);
  slice.forEach(function(r){
    var li = el("li","fitem"); var d = document.createElement("details"); var sm = document.createElement("summary");
    if (OWN){ var st = el("div","bstack"); st.appendChild(badge(r[6])); st.appendChild(srcBadge(isOwn(r))); sm.appendChild(st); }
    else sm.appendChild(badge(r[6]));
    var main = el("div");
    main.appendChild(el("div","ft", (r[1] || "(건물 이름 없음)") + " · " + r[2] + "층"));
    main.appendChild(el("div","fm", HUB_NAME[r[0]] + " (" + HUB_GU[r[0]] + ") · " + fmt(r[3]) + "㎡ (" + (r[3]/3.3058).toFixed(1) + "평) · 대장 「" + P.purps[r[4]] + "」" + (r[5] && HO_SHORT[r[5]] ? " " + HO_SHORT[r[5]] : "")));
    sm.appendChild(main);
    sm.appendChild(el("span","arrow","▼"));
    var fx = el("div","fx");
    var openTxt = r[8] ? indList(r[8], true) : (r[9] ? indList(r[9], true) + " (행위제한 미확인)" : "없음");
    var a = el("span"); a.appendChild(el("b",null,"업종 ")); a.appendChild(document.createTextNode(openTxt)); fx.appendChild(a);
    var b = el("span"); b.appendChild(el("b",null,"수지 ")); b.appendChild(document.createTextNode(econSummary(r))); fx.appendChild(b);
    var c = el("span"); c.appendChild(el("b",null,"건물 공실률 ")); c.appendChild(document.createTextNode(r[18] + "%")); fx.appendChild(c);
    sm.appendChild(fx);
    d.appendChild(sm);
    var body = el("div","fbody"); var ol = document.createElement("ol");
    if (OWN) body.appendChild(ownerBlock(r));
    reasonsOf(r).forEach(function(x){
      var item = document.createElement("li");
      item.appendChild(el("span","k" + (HARD[x.code] ? " h" : SOFT[x.code] ? " s" : ""), RTXT[x.code]));
      item.appendChild(el("span", null, x.text));
      ol.appendChild(item);
    });
    body.appendChild(ol);
    var links = el("div","links");
    var lat = r[20]/1e5, lng = r[21]/1e5;
    var k = el("a", null, "카카오맵에서 위치 보기"); k.href = "https://map.kakao.com/link/map/" + encodeURIComponent(r[1] || "빈 층") + "," + lat + "," + lng; k.target = "_blank"; k.rel = "noopener";
    var p = el("a", null, "PlaceOS 지도에서 열기"); p.href = "https://placeos.co.kr/#/explore?track=page&district=" + encodeURIComponent(HUB_SLUG[r[0]]) + "&building=" + encodeURIComponent(r[24]); p.target = "_blank"; p.rel = "noopener";
    links.appendChild(k); links.appendChild(p);
    links.appendChild(el("span","muted","건물 ID " + r[24] + " · 건물 대표 업종(점포 기준) " + (P.was[r[23]] || "-")));
    body.appendChild(links);
    d.appendChild(body); li.appendChild(d); list.appendChild(li);
  });
}
function csvCell(v){ v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; }
document.getElementById("csvBtn").addEventListener("click", function(){
  var head = ["등급","상권","구","건물 이름","층","면적㎡","면적평","대장 용도","별표1(근사)","용도지역","들어갈 수 있는 업종","세부용도까지 같은 업종","1층 기준 순익률 고급화","가성비","공장제","서울 평균 이상 가격대","1층 기준 흑자 가격대","이 층 임대료로 흑자 가격대","본전까지 더 필요한 매출%(1층 기준·적자일 때)","건물 공실률%","이유","이유 설명","위도","경도","건물 ID"];
  if (OWN) head = ["출처"].concat(head, ["건물주 매물 ID","호실","건물주 적은 면적㎡","거래","보증금(만원)","월세(만원)","관리비(만원)","렌트프리(개월)","입주 가능일","비어 있던 때부터","같은 층 건물주 매물 수"]);
  var lines = [head.map(csvCell).join(",")];
  filtered.forEach(function(r){
    var rs = reasonsOf(r);
    var row = [CL[r[6]].name, HUB_NAME[r[0]], HUB_GU[r[0]], r[1], r[2], r[3], (r[3]/3.3058).toFixed(1), P.purps[r[4]], hoLabel(r[5]), P.zones[r[22]],
      r[8] ? indList(r[8]) : (r[9] ? indList(r[9]) + " (행위제한 미확인)" : ""), indList(r[10]),
      marginTxt(r[26][0]), marginTxt(r[26][1]), marginTxt(r[26][2]), tierList(r[12]), tierList(r[13]), tierList(r[14]), r[28] == null ? "" : (r[28]/100).toFixed(1), r[18],
      rs.map(function(x){ return RTXT[x.code]; }).join(" / "), rs.map(function(x){ return x.text; }).join(" / "),
      r[20]/1e5, r[21]/1e5, r[24]];
    if (OWN){
      var os = ownersOf(r), o = os[0] || null;
      row = [isOwn(r) ? "건물주 직접 등록" : "자료로 찾은 빈 층"].concat(row, o ? [os.map(function(x){ return x.id; }).join(" "), o.unit_label, o.area_m2, o.deal_label, o.deposit_manwon, o.monthly_rent_manwon, o.maintenance_manwon, o.rent_free_months, o.available_from, o.vacant_since, os.length] : ["","","","","","","","","","",""]);
    }
    lines.push(row.map(csvCell).join(","));
  });
  var blob = new Blob(["﻿" + lines.join("\r\n")], {type:"text/csv;charset=utf-8"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (opts.csvName || "placeos-공실-창업가능성-") + M.today + ".csv";
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
});
run();
};
