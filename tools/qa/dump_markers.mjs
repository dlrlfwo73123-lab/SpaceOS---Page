// 앱이 구를 선택했을 때 지도에 찍는 공실 마커(NaverMap: getVacancyMarkers(guCode,'',centers,15))를 그대로 만들어 JSON 으로 출력한다.
// 사용: node tools/qa/dump_markers.mjs   (apps/frontend 의 esbuild 사용, 외부 접속 없음)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/frontend');
const require = createRequire(path.join(root, 'package.json'));
const esbuild = require('esbuild');
const entry = `
  import { SEOUL_GU } from '@/lib/seoul';
  import { getVacancyMarkers } from '@/lib/marketData';
  import { getAllDongCenters } from '@/lib/seoulBoundaries';
  export function dump() {
    return SEOUL_GU.map((gu) => ({
      guCode: gu.code, guName: gu.name,
      markers: getVacancyMarkers(gu.code, '', getAllDongCenters(gu.dongs, gu.code), 15),
    }));
  }`;
const res = await esbuild.build({
  stdin: { contents: entry, resolveDir: path.join(root, 'src'), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': path.join(root, 'src') },
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(res.outputFiles[0].text).toString('base64'));
process.stdout.write(JSON.stringify(mod.dump()));
