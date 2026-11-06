// 3D 트윈 왼쪽 패널에 넣을 '도로 · 위치 확인' — 주소 도로가 건물 바로 앞에 있는지(서버 road_check), 도로 켜고 끄기, 카카오맵 비교 링크, 출처.
import type { RoadCheck, RoadsSource, RoadLayerStats } from './twinRoads';
import { kakaoMapUrl, kakaoRoadviewUrl } from './twinRoads';

type Props = {
  name: string; lat: number; lng: number;
  check: RoadCheck | undefined; source: RoadsSource | undefined; stats: RoadLayerStats | null;
  roadsOn: boolean; onToggle: (on: boolean) => void; error?: string;
};

export default function RoadCheckSection({ name, lat, lng, check, source, stats, roadsOn, onToggle, error }: Props) {
  return (
    <section className="twin3d-sec" aria-label="도로 · 위치 확인">
      <h4>도로 · 위치 확인</h4>
      {error || !stats ? (
        <p className="twin3d-note"><span className="value-absent">도로 자료 없음</span> — 도로 형상을 불러오지 못했습니다. 건물 · 층 정보는 그대로 볼 수 있습니다.</p>
      ) : (
        <>
          <label className="twin3d-note"><input type="checkbox" checked={roadsOn} onChange={e => onToggle(e.target.checked)} /> 3D에 도로 표시</label>
          <ul className="twin3d-note">
            {check?.name ? (
              check.found
                ? <li>주소 도로 <b>{check.name}</b> · 건물에서 도로 가장자리까지 {check.gap_m}m {check.ok ? <b style={{ color: '#047857' }}>✓ 건물 바로 앞</b> : <b style={{ color: '#b91c1c' }}>✗ 멀리 떨어짐 — 좌표 · 주소 확인</b>}</li>
                : <li><b style={{ color: '#b91c1c' }}>주소 도로 {check.name}가 반경 {source?.radius_m ?? 300}m 안에 없음 — 좌표 · 주소 확인</b></li>
            ) : <li>도로명주소에서 도로 이름을 읽지 못했습니다.</li>}
            <li>3D에 그린 도로 {stats.segments}구간 · 교차로 {stats.junctions}곳 · 횡단보도 {stats.crosswalks}곳</li>
          </ul>
        </>
      )}
      <p className="twin3d-note">
        <a href={kakaoMapUrl(name, lat, lng)} target="_blank" rel="noopener noreferrer">카카오맵에서 위치 비교 ↗</a>{' · '}
        <a href={kakaoRoadviewUrl(lat, lng)} target="_blank" rel="noopener noreferrer">카카오 로드뷰 ↗</a>
      </p>
      {source && (
        <p className="twin3d-note">
          도로: {source.by} (<a href={source.license_url} target="_blank" rel="noopener noreferrer">{source.license}</a>) · {source.via}.
          폭 · 차로 · 횡단보도는 도로 등급으로 추정한 그림입니다. 카카오맵은 결과를 저장할 수 없어 같은 좌표를 여는 링크로 눈 비교만 합니다.
        </p>
      )}
    </section>
  );
}
