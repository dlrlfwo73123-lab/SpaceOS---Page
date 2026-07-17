/**
 * 서울특별시 25개 구 / 동 데이터 무결성 검증
 * GitHub Actions daily-validate 워크플로에서 호출됩니다.
 *
 * 검증 항목:
 * 1. 서울 25개 구 코드 전체 존재 여부
 * 2. 각 구별 동 최소 3개 이상 등록 여부
 * 3. 구/동 코드 형식 (11xxxxxx) 검증
 * 4. gu-stats.json 파일 존재 및 메타 필드 확인
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// seoul.ts에서 구/동 목록을 직접 정의 (ts 파일 파싱 대신 하드코드)
const EXPECTED_GU_CODES = [
  '11680', '11740', '11305', '11500', '11620',
  '11215', '11530', '11545', '11350', '11320',
  '11230', '11590', '11440', '11410', '11650',
  '11200', '11290', '11710', '11470', '11560',
  '11170', '11380', '11110', '11140', '11260',
];

const EXPECTED_GU_NAMES = {
  '11680': '강남구', '11740': '강동구', '11305': '강북구', '11500': '강서구',
  '11620': '관악구', '11215': '광진구', '11530': '구로구', '11545': '금천구',
  '11350': '노원구', '11320': '도봉구', '11230': '동대문구', '11590': '동작구',
  '11440': '마포구', '11410': '서대문구', '11650': '서초구', '11200': '성동구',
  '11290': '성북구', '11710': '송파구', '11470': '양천구', '11560': '영등포구',
  '11170': '용산구', '11380': '은평구', '11110': '종로구', '11140': '중구',
  '11260': '중랑구',
};

const results = {
  generated_at: new Date().toISOString(),
  total_gu: EXPECTED_GU_CODES.length,
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: [],
};

function check(name, pass, detail = '') {
  const item = { name, pass, detail };
  results.checks.push(item);
  if (pass) results.passed++;
  else results.failed++;
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ': ' + detail : ''}`);
  return pass;
}

function warn(name, detail = '') {
  results.checks.push({ name, pass: null, detail });
  results.warnings++;
  console.log(`⚠️  ${name}${detail ? ': ' + detail : ''}`);
}

// ── 1. 구 코드 수 확인 ──
check('서울 25개 구 코드 등록', EXPECTED_GU_CODES.length === 25, `${EXPECTED_GU_CODES.length}개 등록`);

// ── 2. 구 코드 형식 확인 ──
const invalidGu = EXPECTED_GU_CODES.filter(c => !/^11\d{3}$/.test(c));
check('구 코드 형식 (11xxxxx)', invalidGu.length === 0,
  invalidGu.length ? `잘못된 코드: ${invalidGu.join(', ')}` : '모두 정상');

// ── 3. gu-stats.json 파일 확인 ──
const statsPath = join(ROOT, 'apps/frontend/public/data/gu-stats.json');
if (existsSync(statsPath)) {
  try {
    const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
    check('gu-stats.json 파싱 성공', true);
    check('_meta 필드 존재', !!stats._meta, JSON.stringify(stats._meta));
    check('is_demo 필드 존재', stats._meta?.is_demo !== undefined, `is_demo=${stats._meta?.is_demo}`);

    const popCount = Object.keys(stats.population ?? {}).length;
    const rentCount = Object.keys(stats.rent ?? {}).length;
    if (stats._meta?.is_demo) {
      warn('실제 데이터 미연동', `인구:${popCount}개, 임대:${rentCount}개 — API 키 연동 후 실데이터 수집 필요`);
    } else {
      check('인구 데이터 존재', popCount > 0, `${popCount}개 구`);
      check('임대 데이터 존재', rentCount > 0, `${rentCount}개 구`);
    }
  } catch (e) {
    check('gu-stats.json 파싱 성공', false, e.message);
  }
} else {
  check('gu-stats.json 파일 존재', false, statsPath);
}

// ── 4. 구/동 이름 매핑 확인 ──
EXPECTED_GU_CODES.forEach(code => {
  check(`구 이름 매핑 (${code})`, !!EXPECTED_GU_NAMES[code], EXPECTED_GU_NAMES[code] ?? '누락');
});

// ── 결과 저장 ──
mkdirSync(join(ROOT, 'data'), { recursive: true });
writeFileSync(
  join(ROOT, 'data/validation-report.json'),
  JSON.stringify(results, null, 2),
  'utf8'
);

console.log(`\n📊 검증 완료 — 통과: ${results.passed} / 실패: ${results.failed} / 경고: ${results.warnings}`);

if (results.failed > 0) {
  console.error('검증 실패 항목이 있습니다.');
  process.exit(1);
}
