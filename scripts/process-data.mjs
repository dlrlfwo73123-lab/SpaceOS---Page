/**
 * 공공데이터 API 응답을 프론트엔드가 사용하는 형식으로 변환
 * GitHub Actions daily-data-fetch 워크플로에서 호출됩니다.
 *
 * 입력: data/raw/ 디렉토리의 JSON 파일들
 * 출력: apps/frontend/public/data/gu-stats.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const RAW = join(ROOT, 'data/raw');
const OUT = join(ROOT, 'apps/frontend/public/data/gu-stats.json');

function readRaw(name) {
  const p = join(RAW, name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

// ── 행정안전부 주민등록인구 처리 ──
function parsePopulation(raw) {
  if (!raw) return {};
  try {
    const items = raw?.response?.body?.items?.item ?? [];
    const result = {};
    for (const item of items) {
      const sggCd = String(item.sggCd ?? item.admmCd ?? '').slice(0, 5);
      if (!sggCd || sggCd.length < 5) continue;
      const total = parseInt(String(item['계'] ?? item.ppltn ?? '0').replace(/,/g, ''), 10);
      if (!result[sggCd] || result[sggCd].population < total) {
        result[sggCd] = { population: total, referDate: item.ppltnReferDt ?? null };
      }
    }
    return result;
  } catch (e) {
    console.error('population parse error:', e.message);
    return {};
  }
}

// ── 한국부동산원 임대동향 처리 ──
function parseRent(raw) {
  if (!raw) return {};
  try {
    const items = raw?.response?.body?.items?.item ?? [];
    const result = {};
    for (const item of items) {
      const sggCd = String(item.sggCd ?? '').slice(0, 5);
      if (!sggCd || sggCd.length < 5) continue;
      // 소매 공실률 / 임대료 우선
      const vacancyRate = parseFloat(item.retailLotRt ?? item.officeLotRt ?? item.vacancyRt ?? '0');
      const rentIdx = parseFloat(item.retailRentIdx ?? item.officeRentIdx ?? item.rentIdx ?? '0');
      result[sggCd] = {
        vacancyRate: isNaN(vacancyRate) ? null : vacancyRate,
        rentIndex: isNaN(rentIdx) ? null : rentIdx,
        baseYearMonth: item.baseYearMonth ?? null,
      };
    }
    return result;
  } catch (e) {
    console.error('rent parse error:', e.message);
    return {};
  }
}

// ── 전국지가변동률 처리 ──
function parseLandPrice(raw) {
  if (!raw) return {};
  try {
    const items = raw?.response?.body?.items?.item ?? [];
    const result = {};
    for (const item of items) {
      const sggCd = String(item.ldcdSgg ?? item.sggCd ?? '').slice(0, 5);
      if (!sggCd || sggCd.length < 5) continue;
      const changeRate = parseFloat(item.ldVlChgRt ?? item.changeRate ?? '0');
      result[sggCd] = {
        changeRate: isNaN(changeRate) ? null : changeRate,
        baseDate: item.baseDate ?? null,
      };
    }
    return result;
  } catch (e) {
    console.error('land_price parse error:', e.message);
    return {};
  }
}

const population = parsePopulation(readRaw('population.json'));
const rent = parseRaw('rent-market.json') ? parseRent(readRaw('rent-market.json')) : {};
const landPrice = parseRaw('land-price.json') ? parseLandPrice(readRaw('land-price.json')) : {};

const hasRealData = Object.keys(population).length > 0 || Object.keys(rent).length > 0;

const output = {
  _meta: {
    is_demo: !hasRealData,
    generated_at: new Date().toISOString(),
    source: hasRealData
      ? '행정안전부 주민등록인구통계 · 한국부동산원 상업용부동산 임대동향조사 · 전국지가변동률조사'
      : 'demo — API fetch returned no data',
    population_count: Object.keys(population).length,
    rent_count: Object.keys(rent).length,
    land_price_count: Object.keys(landPrice).length,
  },
  population,
  rent,
  land_price: landPrice,
};

writeFileSync(OUT, JSON.stringify(output, null, 2), 'utf8');
console.log(`✅ gu-stats.json 생성 완료 — 인구: ${Object.keys(population).length}개 구, 임대: ${Object.keys(rent).length}개 구, 지가: ${Object.keys(landPrice).length}개 구`);
