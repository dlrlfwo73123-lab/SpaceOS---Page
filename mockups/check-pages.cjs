// PlaceOS 추가사항 시안 자동 점검
// 사용법:  node check-pages.cjs [시안 폴더 경로]   (기본값: 이 파일 옆의 placeos-additions)
// 준비:    npm i -D playwright  &&  npx playwright install chromium
// 확인 내용: 각 화면을 데스크톱(1440×900)·모바일(390×844)로 열어
//   ① 스크립트 오류(pageerror) ② 콘솔 오류 ③ 모바일 가로 넘침 ④ 핵심 요소 존재 ⑤ 기본 클릭 동작을 확인합니다.
// 선택: ROUTE_HOOK=경로.cjs 를 주면 그 모듈(async (page) => {})로 네트워크 경로를 바꿀 수 있습니다(CDN이 막힌 환경에서 로컬 사본을 쓸 때).
const path = require('path');
const { chromium } = require('playwright');

const dir = path.resolve(process.argv[2] || path.join(__dirname, 'placeos-additions'));
const hook = process.env.ROUTE_HOOK ? require(path.resolve(process.env.ROUTE_HOOK)) : null;

// 화면별 점검: must = 반드시 있어야 하는 요소, act = 눌러 볼 순서
const PAGES = [
  { file: 'index.html', must: ['.flow .case'], act: [] },
  { file: 'case1-district-map.html', must: ['.leaflet-container', '.zi', '#detail h2'],
    act: [['click', '#modeSeg button[data-mode=fit]'], ['select', '#hoodSel', 'mangwon'], ['click', '.zi'], ['click', '#modeSeg button[data-mode=vac]']] },
  { file: 'case2-3d-floor-twin.html', must: ['#elev button', '.fhead h2', '.vc'],
    act: [['click', '#scSeg button[data-s=B]'], ['click', '#modeSeg button[data-m=explode]'], ['click', '#elev button'], ['click', '#scSeg button[data-s=C]']] },
  { file: 'case3-streetview-floor.html', must: ['#openBtn', '.vcard'],
    act: [['click', '#openBtn'], ['visible', '#viewer'], ['click', '#yearSeg button[data-y="2019"]'], ['click', '#fpIn .dir button'], ['click', '#closeBtn']] },
  { file: 'case4-nearby-competitors.html', must: ['.leaflet-container', '.poi', '.tiles'],
    act: [['click', '#scSeg button[data-s=C]'], ['click', '.qbtn[data-r="50"]'], ['click', '.fchip[data-k=chain]']] },
  { file: 'case5-customer-ledger.html', must: ['#ledBody tr', '.kpi'],
    act: [['click', '#tabs button[data-t=events]'], ['click', '#tabs button[data-t=interior]'], ['click', '#tabs button[data-t=profile]'], ['click', '#scSeg button[data-s=C]']] },
  { file: 'verification-report.html', must: ['#summary', '#sources'], act: [] },
];
const VIEWS = [{ name: '데스크톱', width: 1440, height: 900 }, { name: '모바일', width: 390, height: 844 }];
// 지도 타일 한두 장이 늦거나 빠지는 것은 화면 동작과 무관해 경고로만 봅니다.
const SOFT = /Failed to load resource|net::ERR_|GL Driver Message|GPU stall/;

(async () => {
  const browser = await chromium.launch();
  let fails = 0;
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
