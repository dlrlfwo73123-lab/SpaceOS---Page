// PlaceOS 참고.html 만들기 — Case 1~5 시안 파일을 HTML 하나로 묶는다.
// 사용법:  node build-placeos-ref.cjs [시안 폴더 경로]   (기본값: 이 파일 옆의 placeos-additions, 압축을 푼 폴더 안이면 ".")
// 원본 5개는 바꾸지 않는다. 묶음 파일 안에서는 각 화면을 그대로 iframe(srcdoc)에 띄우고,
//   ① 주소 값(?s= · ?f= · ?tab=)은 window.__QS로 넘기고 ② 화면끼리 이동하는 링크 · 주소 바꾸기는 부모 창이 받아 처리한다.
// 시안 파일을 고친 뒤에는 이 스크립트를 다시 실행해야 묶음 파일에 반영된다(check-pages.cjs가 최신인지 검사).
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const OUT = 'PlaceOS 참고.html';
const CASES = [
  { id:'case1', file:'case1-district-map.html', no:1, emoji:'🗺', title:'다른 상권 찾기', h:'동네를 상권 구역으로 나눠 추천 업종 · 특징 · 공실률', q:{ A:'?zone=yeonmu', B:'?zone=office', C:'?zone=ttuk' } },
  { id:'case2', file:'case2-3d-floor-twin.html', no:2, emoji:'🏢', title:'공실 · 3D 트윈', h:'공실을 고르면 건물 층별 3D 디지털 트윈 · 공실률 6가지 기준', q:{ A:'?s=A', B:'?s=B', C:'?s=C' } },
  { id:'case3', file:'case3-streetview-floor.html', no:3, emoji:'🏙', title:'거리뷰 · 층별보기', h:'거리뷰 위 층 라벨 · 층별 안내판 · 3D와 같은 평면도', q:{ A:'?s=A', B:'?s=B', C:'?s=C' } },
  { id:'case4', file:'case4-nearby-competitors.html', no:4, emoji:'📍', title:'이 자리와 업종', h:'반경 50~100m 같은 업종 · 체인 · 경쟁 강도(보행 거리 · 층)', q:{ A:'?s=A', B:'?s=B', C:'?s=C' } },
  { id:'case5', file:'case5-customer-ledger.html', no:5, emoji:'🧾', title:'손님 모으기', h:'가계부 · 행사 연계 · 상권 맞춤 인테리어 · 실사 사진 · AI 이미지', q:{ A:'?s=A', B:'?s=B', C:'?s=C' } },
];
const SC = { A:'A · 연무장길 2층 (디저트 카페)', B:'B · 성수이로 1층 (샐러드)', C:'C · 먹자골목 지하 (이자카야)' };

// 묶음 안에서만 쓰는 바꿔치기 — 바꿀 곳이 없거나 여러 번 나오면 멈춘다(원본 구조가 바뀌었다는 뜻)
function transform(c, html){
  let s = html;
  const once = (from, to, label) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`${c.file}: '${label}' ${n}곳 (1곳이어야 함)`); s = s.replace(from, to); };
  once('<meta charset="utf-8">', '<meta charset="utf-8">\n<!--PLACEOS-SHIM-->', 'meta charset');
  const nSearch = (s.match(/location\.search/g) || []).length;
  if (!nSearch) throw new Error(`${c.file}: location.search 없음`);
  s = s.replace(/location\.search/g, '(window.__QS ?? location.search)');
  if (c.id === 'case2') once("location.replace(location.pathname + '?' + q)", "(window.__PLACEOS_RELOAD ? window.__PLACEOS_RELOAD(String(q)) : location.replace(location.pathname + '?' + q))", 'cdn 다시 열기');
  if (c.id === 'case4'){
    const m = s.match(/location\.href = (`[^`]+`)/g) || [];
    if (m.length !== 1) throw new Error(`${c.file}: location.href = \`…\` ${m.length}곳`);
    s = s.replace(/location\.href = (`[^`]+`)/, '(window.__PLACEOS_GO || (u => { location.href = u; }))($1)');
  }
  return s;
}

// 각 화면 맨 앞(메타 charset 바로 뒤)에 넣는 연결 코드 — 부모 창이 열 때 window.__QS · __PLACEOS_ID와 함께 끼워 넣음
const SHIM = `(function(){
  var id = window.__PLACEOS_ID, post = function(m){ m.placeos = 1; m.id = id; try { parent.postMessage(m, '*'); } catch (e) {} };
  var rs = history.replaceState.bind(history), ps = history.pushState.bind(history);
  function tell(u){ try { var x = new URL(String(u), 'http://x/'); window.__QS = x.search; post({ t:'url', qs:x.search }); } catch (e) {} }
  history.replaceState = function(s, t, u){ if (u != null) tell(u); try { rs(s, t); } catch (e) {} };
  history.pushState = function(s, t, u){ if (u != null) tell(u); try { ps(s, t); } catch (e) {} };
  var CASE = /^(?:\\.\\/)?(case[1-5])-[\\w-]+\\.html(\\?[^#]*)?(#.*)?$/i, HOME = /^(?:\\.\\/)?index\\.html/i;
  window.__PLACEOS_GO = function(h){ h = String(h); var m = h.match(CASE); if (m) post({ t:'nav', to:m[1].toLowerCase(), qs:m[2] || '' }); else if (HOME.test(h)) post({ t:'nav', to:'home', qs:'' }); else post({ t:'open', href:h }); };
  window.__PLACEOS_RELOAD = function(qs){ qs = String(qs); post({ t:'reload', qs:qs.charAt(0) === '?' ? qs : '?' + qs }); };
  document.addEventListener('click', function(e){
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a || a.hasAttribute('download')) return;
    var h = a.getAttribute('href'); if (!h || /^(https?:|mailto:|tel:|#|javascript:|blob:|data:)/i.test(h)) return;
    e.preventDefault(); window.__PLACEOS_GO(h);
  }, true);
})();`;

function build(dir){
  const docs = {}, info = [];
  for (const c of CASES){
    const raw = fs.readFileSync(path.join(dir, c.file), 'utf8');
    docs[c.id] = { file:c.file, title:c.title, html:transform(c, raw) };
    info.push({ id:c.id, file:c.file, kb:Math.round(Buffer.byteLength(raw) / 1024), sha:crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12) });
  }
  return { docs, info };
}
// JSON을 <script type="application/json"> 안에 안전하게 넣기('<'를 \\u003c로)
const jsonSafe = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function page({ docs, info }){
  const cards = CASES.map(c => `<article class="rc" data-go="${c.id}">
      <button type="button" class="rc-open" data-go="${c.id}"><span class="num">${c.no}</span><span class="em" aria-hidden="true">${c.emoji}</span><b>${esc(c.title)}</b><small>${esc(c.h)}</small><span class="go">화면 열기 →</span></button>
      <div class="sc">${Object.entries(c.q).map(([k, q]) => `<a href="#${c.id}${q}" title="${esc(SC[k])}">${k}</a>`).join('')}</div>
    </article>`).join('\n    ');
  const rows = info.map(x => `<tr><td>${x.id.replace('case', 'Case ')}</td><td><code>${esc(x.file)}</code></td><td>${x.kb.toLocaleString()} KB</td><td><code>${x.sha}</code></td></tr>`).join('');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PlaceOS 참고</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
:root{--bg:#f1f5f9;--surface:#fff;--line:#e2e8f0;--text:#0f172a;--text-2:#475569;--text-3:#94a3b8;--brand:#4f46e5;--brand-soft:#eef2ff;--brand-ink:#3730a3;--head:#0f172a;--r:14px;--sh:0 1px 2px rgba(15,23,42,.05),0 6px 20px rgba(15,23,42,.06)}
html,body{margin:0;height:100%}
body{font-family:'Noto Sans KR',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;cursor:pointer}
.gnb{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:18px;height:56px;padding:0 20px;background:var(--head);color:#fff}
.logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:17px;flex-shrink:0}
.logo i{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);font-style:normal;font-size:14px}
.gnb nav{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}
.gnb nav::-webkit-scrollbar{display:none}
.gnb nav button{white-space:nowrap;border:0;background:none;color:#cbd5e1;font-size:13px;font-weight:500;padding:7px 12px;border-radius:999px}
.gnb nav button:hover{background:rgba(255,255,255,.08);color:#fff}
.gnb nav button b{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;background:rgba(255,255,255,.15);font-size:10px;margin-right:6px}
.demo-pill{white-space:nowrap;font-size:11px;font-weight:700;color:#fde68a;border:1px solid rgba(253,230,138,.4);padding:3px 9px;border-radius:999px;flex-shrink:0}
.wrap{max-width:1180px;margin:0 auto;padding:22px 20px 36px}
.eyebrow{font-size:11px;font-weight:700;color:var(--brand);letter-spacing:.06em}
h1{margin:4px 0 6px;font-size:24px;letter-spacing:-.02em}
.lead{margin:0;color:var(--text-2);max-width:820px}
.rcs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:18px}
.rc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh);display:flex;flex-direction:column;overflow:hidden}
.rc-open{display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:left;border:0;background:none;padding:16px 16px 10px;flex:1}
.rc-open:hover{background:var(--brand-soft)}
.rc .num{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--brand);color:#fff;font-size:12px;font-weight:800}
.rc .em{font-size:22px;line-height:1}
.rc b{font-size:15px}
.rc small{color:var(--text-2);font-size:12.5px}
.rc .go{margin-top:auto;font-size:12px;font-weight:700;color:var(--brand-ink)}
.sc{display:flex;gap:6px;padding:0 16px 14px}
.sc a{flex:1;text-align:center;font-size:12px;font-weight:700;text-decoration:none;color:var(--brand-ink);background:var(--brand-soft);border-radius:8px;padding:5px 0}
.sc a:hover{background:#e0e7ff}
.notes{display:grid;grid-template-columns:1.2fr 1fr;gap:12px;margin-top:16px}
.box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh);padding:16px}
.box h2{margin:0 0 8px;font-size:14px}
.box ul{margin:0;padding-left:18px;color:var(--text-2);font-size:12.5px}
.box li{margin:3px 0}
.box table{width:100%;border-collapse:collapse;font-size:12px}
.box td{padding:4px;border-bottom:1px solid var(--line)}
.box code{font-size:11px}
.foot{margin-top:14px;font-size:11.5px;color:var(--text-3)}
#stage iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff;visibility:hidden;pointer-events:none}
#stage iframe.on{visibility:visible;pointer-events:auto}
body.in-case{overflow:hidden}
body.in-case #home{visibility:hidden}
:focus-visible{outline:3px solid #6366f1;outline-offset:2px}
@media (max-width:1100px){ .rcs{grid-template-columns:repeat(3,minmax(0,1fr))} .notes{grid-template-columns:1fr} }
@media (max-width:760px){
  .gnb{padding:0 12px;gap:10px}
  .demo-pill{font-size:0;padding:3px 7px}
  .demo-pill:after{content:'데모';font-size:10.5px}
  .wrap{padding:16px 16px 28px}
  .rcs{grid-template-columns:1fr 1fr}
}
@media (max-width:480px){ .rcs{grid-template-columns:1fr} }
</style>
</head>
<body>
<div id="home">
  <header class="gnb">
    <div class="logo"><i>P</i>PlaceOS 참고</div>
    <nav aria-label="화면">${CASES.map(c => `<button type="button" data-go="${c.id}"><b>${c.no}</b>${esc(c.title)}</button>`).join('')}</nav>
    <span class="demo-pill">추가안 시안 · 데모 데이터</span>
  </header>
  <main class="wrap">
    <div class="eyebrow">PLACEOS · 추가사항 시안 묶음</div>
    <h1>PlaceOS 참고 — 추가사항 5가지를 한 파일로</h1>
    <p class="lead">Case 1~5 화면을 이 HTML 하나에 그대로 담았습니다. 카드나 위 메뉴를 누르면 그 화면이 열리고, 화면 안의 메뉴 · 이동 버튼(예: '공실 · 3D 트윈', '거리뷰 · 층별보기')도 이 파일 안에서 이어집니다. 화면 왼쪽 위 로고를 누르면 이 목차로 돌아옵니다. A · B · C는 같은 공실 시나리오입니다.</p>
    <div class="rcs">
    ${cards}
    </div>
    <div class="notes">
      <div class="box"><h2>알아 둘 점</h2><ul>
        <li>원본 5개 파일과 내용이 같습니다 — 이 파일 안에서는 주소 값(?s= · ?f= · ?tab=)과 화면 사이 이동만 이어 줍니다.</li>
        <li>인터넷이 있어야 지도 · 3D · 웹폰트 · 업종 실사 사진 · AI 이미지가 보입니다(라이브러리는 CDN에서 받음).</li>
        <li>주소창의 <code>#case2?s=B&amp;f=2</code> 같은 주소로 원하는 화면 · 시나리오를 바로 열 수 있고, 뒤로 가기도 됩니다.</li>
        <li>가계부 · 행사 계획 · 인테리어 설정은 이 브라우저에만 저장됩니다(원본 파일과 같은 저장 공간).</li>
        <li>'검증 리포트' 메뉴는 이 파일과 같은 폴더의 <code>verification-report.html</code>을 새 탭으로 엽니다.</li>
        <li>모든 수치는 데모 데이터이며 실제 창업 · 임대 판단에 쓰지 마세요.</li>
      </ul></div>
      <div class="box"><h2>묶은 원본</h2><table>${rows}</table>
        <p class="foot">만든 시각 ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · 원본을 고친 뒤에는 <code>node build-placeos-ref.cjs</code>로 다시 만듭니다.</p></div>
    </div>
  </main>
</div>
<div id="stage" aria-live="polite"></div>
<script type="application/json" id="docs">${jsonSafe(docs)}</script>
<script>
// PlaceOS 참고 — 화면 전환 · 주소(#case2?s=B) · 화면 안 링크 연결
const DOCS = JSON.parse(document.getElementById('docs').textContent);
const SHIM = ${JSON.stringify(SHIM).replace(/</g, '\\u003c')};
const IDS = Object.keys(DOCS), F = {};
let curId = 'home';
const stage = document.getElementById('stage');
function load(id, qs){
  if (!F[id]){
    const el = document.createElement('iframe');
    el.dataset.id = id; el.title = DOCS[id].title; el.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');
    stage.appendChild(el); F[id] = { el, qs:null };
  }
  const f = F[id]; f.qs = qs || '';
  const head = '<scr' + 'ipt>window.__QS=' + JSON.stringify(f.qs) + ';window.__PLACEOS_ID=' + JSON.stringify(id) + ';</scr' + 'ipt><scr' + 'ipt>' + SHIM + '</scr' + 'ipt>';
  f.el.srcdoc = DOCS[id].html.replace('<!--PLACEOS-SHIM-->', () => head);
}
function show(id){
  curId = id;
  document.body.classList.toggle('in-case', id !== 'home');
  Object.entries(F).forEach(([k, f]) => { const on = k === id; f.el.classList.toggle('on', on); f.el.toggleAttribute('inert', !on); });
  document.title = id === 'home' ? 'PlaceOS 참고' : 'PlaceOS 참고 · ' + DOCS[id].title;
  if (id !== 'home') F[id].el.focus(); else window.scrollTo(0, 0);
}
function parse(h){
  const m = String(h || '').match(/^#(case[1-5])(\\?[^#]*)?$/);
  return m && DOCS[m[1]] ? { id:m[1], qs:m[2] || '' } : { id:'home', qs:'' };
}
function route(){
  const { id, qs } = parse(location.hash);
  if (id !== 'home' && (!F[id] || (qs && qs !== F[id].qs))) load(id, qs);
  show(id);
}
function go(id, qs){ const h = id === 'home' ? '#' : '#' + id + (qs || ''); if (location.hash === h || (h === '#' && !location.hash)) route(); else location.hash = h; }
addEventListener('hashchange', route);
document.getElementById('home').addEventListener('click', e => {
  const b = e.target.closest('button[data-go]'); if (b) go(b.dataset.go, '');
});
addEventListener('message', e => {
  const d = e.data; if (!d || d.placeos !== 1) return;
  const f = Object.values(F).find(x => x.el.contentWindow === e.source); if (!f) return;
  const id = f.el.dataset.id;
  if (d.t === 'url'){ f.qs = d.qs; if (curId === id) history.replaceState(null, '', '#' + id + d.qs); }
  else if (d.t === 'nav') go(d.to, d.qs);
  else if (d.t === 'reload'){ load(id, d.qs); if (curId === id) history.replaceState(null, '', '#' + id + d.qs); }
  else if (d.t === 'open') window.open(new URL(d.href, location.href).href, '_blank', 'noopener');
});
route();
</script>
</body>
</html>
`;
}

if (require.main === module){
  const dir = path.resolve(process.argv[2] || path.join(__dirname, 'placeos-additions'));
  const b = build(dir), html = page(b);
  fs.writeFileSync(path.join(dir, OUT), html);
  console.log(`${OUT} 만듦 — ${Math.round(Buffer.byteLength(html) / 1024).toLocaleString()} KB (${b.info.map(x => x.id).join(' · ')})`);
}
module.exports = { build, transform, CASES, OUT, SHIM };
