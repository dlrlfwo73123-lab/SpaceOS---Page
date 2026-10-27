// PlaceOS 추가사항 시안 자동 점검
// 사용법:  node check-pages.cjs [시안 폴더 경로]   (기본값: 이 파일 옆의 placeos-additions)
// 준비:    npm i -D playwright  &&  npx playwright install chromium
// 확인 내용: 각 화면을 데스크톱(1440×900)·모바일(390×844)로 열어
//   ① 스크립트 오류(pageerror) ② 콘솔 오류 ③ 모바일 가로 넘침 ④ 핵심 요소 존재 ⑤ 기본 클릭 동작을 확인합니다.
//   ⑥ 데이터 검사: 호실 면적 합 = 3D · 평면 칸 면적, 층 바닥 합 = 가로×깊이, Case 2 · 3 공통 건물 블록이 똑같은지, 시나리오 좌표가 화면마다 같은지,
//      Case 5 공실 치수 · Case 4 출입구 · 같은 건물 입점이 공통 건물 블록과 맞는지, 인테리어 배치안이 겹치거나 벽 밖으로 나가지 않는지.
// 선택: ROUTE_HOOK=경로.cjs 를 주면 그 모듈(async (page) => {})로 네트워크 경로를 바꿀 수 있습니다(CDN이 막힌 환경에서 로컬 사본을 쓸 때).
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { chromium } = require('playwright');

const dir = path.resolve(process.argv[2] || path.join(__dirname, 'placeos-additions'));
const hook = process.env.ROUTE_HOOK ? require(path.resolve(process.env.ROUTE_HOOK)) : null;

// 화면별 점검: must = 반드시 있어야 하는 요소, act = 눌러 볼 순서
const PAGES = [
  { file: 'index.html', must: ['.flow .case'], act: [] },
  { file: 'case1-district-map.html', must: ['.leaflet-container', '.zi', '#detail h2', '.twinpin'],
    act: [['click', '#modeSeg button[data-mode=fit]'], ['select', '#hoodSel', 'mangwon'], ['click', '.zi'], ['click', '#modeSeg button[data-mode=vac]']] },
  { file: 'case2-3d-floor-twin.html', must: ['#elev button', '.fhead h2', '.vc', '#vacAgg .agg', '#ledgerChk .lsum'],
    act: [['click', '#ledgerChk summary'], ['click', '#ledDemo'], ['click', '#ledRun'], ['click', '#scSeg button[data-s=B]'], ['click', '#modeSeg button[data-m=explode]'], ['click', '#elev button'], ['click', '#scSeg button[data-s=C]']] },
  { file: 'case3-streetview-floor.html', must: ['#openBtn', '.vcard'],
    act: [['click', '#openBtn'], ['visible', '#viewer'], ['click', '#yearSeg button[data-y="2019"]'], ['click', '#fpIn .dir button'], ['click', '#closeBtn'],
      // 호실 전용면적 = 배치 칸 면적 합, 층 칸 면적 합 = 바닥(가로×깊이), 넘친 호실 없음
      ['eval', `Object.values(BUILDINGS).every(b => b.floors.every(f => { const l = layoutFloor(b, f); const tot = l.pieces.reduce((s, p) => s + pieceArea(p), 0);
        return !l.overflow.length && Math.abs(tot - b.W * b.D) < .5 && f.units.every(u => Math.abs((l.units[u.no] || []).reduce((s, p) => s + pieceArea(p), 0) - u.a) < 1); }))`, '호실 면적과 배치 칸 면적이 맞지 않음']] },
  { file: 'case4-nearby-competitors.html', must: ['.leaflet-container', '.poi', '.tiles'],
    act: [['click', '#scSeg button[data-s=C]'], ['click', '.qbtn[data-r="50"]'], ['click', '.fchip[data-k=chain]'], ['click', '#mSeg button[data-m=line]'], ['click', '#mSeg button[data-m=real]']] },
  { file: 'case5-customer-ledger.html', must: ['#ledBody tr', '.kpi', '#kwset .kwr', '#vdesign svg'],
    act: [['click', '#tabs button[data-t=events]'], ['click', '#tabs button[data-t=interior]'], ['click', '#concepts .cc:nth-child(2)'], ['click', '#iDay button[data-v="1"]'], ['click', '#iSeed'],
      ['visible', '#idetail .ipic svg'], ['click', '.kwr .lv button[data-lv="3"]'], ['click', '#dScope button[data-v=part]'], ['visible', '#vdesign svg'],
      // 기본 키워드 설정이면 적합도가 설정 없이 계산한 값과 같아야 함
      ['eval', `CONCEPTS.every(c => ['A','B','C'].every(k => fitOf(c, INTERIOR[k], SC[k].profile).total === fitOf(c, INTERIOR[k], SC[k].profile, designDefault(INTERIOR[k])).total))`, '기본 키워드 설정에서 적합도가 달라짐'],
      // 배치안: 키워드를 많이 켜도 칸이 겹치거나 벽 밖으로 나가지 않아야 함
      ['eval', `['A','B','C'].every(k => { const it = INTERIOR[k], D = designDefault(it); D.on = { ...D.on, group:2, pet:2, work:2, pickup:2, photo:2, solo:2, hidden:2, grill:2 }; const V = VACANCY[k];
        return ['gallery','noren','green','grab'].every(id => { const dz = designOf(CONCEPTS.find(x => x.id === id), it, D), pl = planOf(V, indKeyOf(SC[k].profile.ind), dz.rows);
          const solid = pl.zones.filter(z => z.k !== 'stool' && !z.inside); let ok = pl.seats > 0 && pl.zones.every(z => z.u0 >= -1e-6 && z.u1 <= V.w + 1e-6 && z.v0 >= -1e-6 && z.v1 <= V.d + 1e-6);
          for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++){ const a = solid[i], b = solid[j]; if (Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0) > 1e-6 && Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0) > 1e-6) ok = false; }
          return ok; }); })`, '인테리어 배치안 칸이 겹치거나 벽 밖으로 나감'],
      ['click', '#tabs button[data-t=profile]'], ['click', '#scSeg button[data-s=C]']] },
  { file: 'verification-report.html', must: ['#summary', '#sources'], act: [] },
];
const VIEWS = [{ name: '데스크톱', width: 1440, height: 900 }, { name: '모바일', width: 390, height: 844 }];
// 지도 타일 한두 장이 늦거나 빠지는 것은 화면 동작과 무관해 경고로만 봅니다.
const SOFT = /Failed to load resource|net::ERR_|GL Driver Message|GPU stall/;

// 파일끼리 맞아야 하는 값: 공통 건물 블록(Case 2 · 3), 시나리오 건물 좌표(Case 1 · 2 · 3 · 4)
function crossChecks(){
  const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
  const block = t => { const a = t.indexOf('// ── 공통 건물 블록 ('), b = t.indexOf('// ── 공통 건물 블록 끝 ──'); return a >= 0 && b > a ? t.slice(a, b) : null; };
  const errs = [];
  const b2 = block(read('case2-3d-floor-twin.html')), b3 = block(read('case3-streetview-floor.html'));
  if (!b2 || !b3) errs.push('공통 건물 블록 표시(시작 · 끝 주석)를 찾지 못함');
  else if (b2 !== b3) errs.push('Case 2와 Case 3의 공통 건물 블록이 다름 — 한쪽만 고친 것');
  const ll = (t, re) => [...t.matchAll(re)].map(m => m[1] + ',' + m[2].replace(/\s/g, ''));
  const c1 = ll(read('case1-district-map.html'), /\b([ABC]):\{ name:'[^']+', ll:\[([\d.]+, ?[\d.]+)\]/g);
  const c2 = ll(b2 || '', /^  ([ABC]): \{[\s\S]*?ll:\[([\d.]+, ?[\d.]+)\]/gm);
  const c4 = ll(read('case4-nearby-competitors.html'), /\b([ABC]):\{ name:'[^']+', zone:'[^']+', center:\[([\d.]+, ?[\d.]+)\]/g);
  const norm = a => a.map(x => x.replace(/,(\d)/, ', $1').replace(/\s+/g, '')).sort().join(' | ');
  // 공통 건물 블록을 실행해 Case 4 · 5의 값과 맞춰 봄
  if (b2) try {
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(b2 + '\n;globalThis.__X = { BUILDINGS, layoutFloor, pieceArea };', ctx);
    const { BUILDINGS, layoutFloor } = ctx.__X;
    const c5 = read('case5-customer-ledger.html'), c4t = read('case4-nearby-competitors.html');
    const vac = vm.runInNewContext('(' + c5.slice(c5.indexOf('const VACANCY = {') + 'const VACANCY = '.length, c5.indexOf('\n};', c5.indexOf('const VACANCY = {')) + 2) + ')');
    for (const k of ['A', 'B', 'C']){
      const b = BUILDINGS[k], f = b.floors.find(x => x.lv === b.start.lv), u = f.units.find(x => x.no === b.start.no);
      const ps = layoutFloor(b, f).units[u.no], p = ps[0], V = vac[k];
      if (ps.length !== 1 || Math.abs((p.x1 - p.x0) - V.w) > .05 || Math.abs((p.z1 - p.z0) - V.d) > .05 || V.area !== u.a || V.no !== u.no) errs.push(`Case 5 공실 치수(${k} ${V.no}호 ${V.w}×${V.d}m)가 3D 배치(${(p.x1 - p.x0).toFixed(2)}×${(p.z1 - p.z0).toFixed(2)}m)와 다름`);
      // 출입구: 1층 공실은 그 호실 앞면 가운데, 그 밖은 1층 앞줄 공용 칸 중 가장 넓은 칸 가운데
      const f1 = b.floors.find(x => x.lv === 1), front = layoutFloor(b, f1).pieces.filter(q => q.z1 >= b.D / 2 - 1e-6 && q.kind !== 'core');
      const ep = b.start.lv === 1 ? p : front.filter(q => q.kind === 'com').sort((a, c) => (c.x1 - c.x0) - (a.x1 - a.x0))[0];
      const m = c4t.match(new RegExp(k + ":\\{ name:[^\\n]*?entry:\\{ x:(-?[\\d.]+), z:(-?[\\d.]+)"));
      if (!m || Math.abs(+m[1] - (ep.x0 + ep.x1) / 2) > .05 || Math.abs(+m[2] - b.D / 2) > .05) errs.push(`Case 4 ${k} 출입구 좌표가 3D 배치의 출입구(${((ep.x0 + ep.x1) / 2).toFixed(2)}, ${b.D / 2})와 다름`);
      // 같은 건물 입점 이름
      const sb = vm.runInNewContext('(' + c4t.slice(c4t.indexOf('const SAME_BLDG = {') + 'const SAME_BLDG = '.length, c4t.indexOf('\n};', c4t.indexOf('const SAME_BLDG = {')) + 2) + ')');
      sb[k].forEach(([no, name, , lv]) => { const fl = b.floors.find(x => x.lv === lv), un = fl && fl.units.find(x => x.no === no); if (!un || un.name !== name) errs.push(`Case 4 같은 건물 ${k} ${no}호 '${name}'이 3D 호실(${un ? un.name : '없음'})과 다름`); });
    }
  } catch (e) { errs.push('공통 블록 실행 검사 실패: ' + e.message); }
  if (c1.length !== 3 || c2.length !== 3 || c4.length !== 3) errs.push(`시나리오 좌표를 다 찾지 못함 (Case1 ${c1.length} · Case2/3 ${c2.length} · Case4 ${c4.length})`);
  else if (norm(c1) !== norm(c2) || norm(c2) !== norm(c4)) errs.push(`시나리오 건물 좌표가 화면마다 다름: Case1 ${norm(c1)} / Case2·3 ${norm(c2)} / Case4 ${norm(c4)}`);
  return errs;
}

(async () => {
  const browser = await chromium.launch();
  let fails = 0;
  const cross = crossChecks();
  console.log(cross.length ? '실패  파일 간 데이터 일치' : '통과  파일 간 데이터 일치 (공통 건물 블록 · 좌표 · 공실 치수 · 출입구 · 같은 건물 입점)');
  cross.forEach(e => console.log('    - ' + e));
  if (cross.length) fails++;
  for (const pg of PAGES) {
    for (const v of VIEWS) {
      const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
      if (hook) await hook(page);
      const errors = [], warns = [];
      page.on('pageerror', e => errors.push('스크립트 오류: ' + e.message));
      page.on('console', m => {
        if (m.type() !== 'error') return;
        (SOFT.test(m.text()) ? warns : errors).push('콘솔: ' + m.text());
      });
      const url = 'file://' + path.join(dir, pg.file);
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1500);
        for (const sel of pg.must) {
          if (!(await page.$(sel))) errors.push('요소 없음: ' + sel);
        }
        for (const [kind, sel, val] of pg.act) {
          try {
            if (kind === 'click') await page.click(sel, { timeout: 5000 });
            if (kind === 'select') await page.selectOption(sel, val);
            if (kind === 'visible' && !(await page.isVisible(sel))) errors.push('안 보임: ' + sel);
            if (kind === 'eval' && !(await page.evaluate(sel))) errors.push('데이터 검사 실패: ' + val);
            await page.waitForTimeout(250);
          } catch (e) { errors.push(`동작 실패 (${kind} ${sel}): ${e.message.split('\n')[0]}`); }
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 2) errors.push(`가로 넘침 ${overflow}px`);
      } catch (e) {
        errors.push('열기 실패: ' + e.message.split('\n')[0]);
      }
      const ok = errors.length === 0;
      if (!ok) fails++;
      console.log(`${ok ? '통과' : '실패'}  ${pg.file}  [${v.name}]${warns.length ? `  (경고 ${warns.length}건)` : ''}`);
      errors.forEach(e => console.log('    - ' + e));
      await page.close();
    }
  }
  await browser.close();
  console.log(fails ? `\n실패 ${fails}건 — 위 내용을 AI에게 그대로 붙여 넣고 고쳐 달라고 하세요.` : '\n모든 화면 통과');
  process.exit(fails ? 1 : 0);
})();
