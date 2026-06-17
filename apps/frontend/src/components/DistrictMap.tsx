import { useState } from 'react';
import VacancyHeatmap from './VacancyHeatmap';

const COMMERCIAL_DISTRICTS: { code: string; name: string }[] = [
  { code: 'lapesta', name: '라페스타' },
  { code: 'gangnam', name: '강남' },
  { code: 'hongdae', name: '홍대' },
  { code: 'jongno', name: '종로' },
];

type DistrictMapProps = {
  onSelectBuilding?: (buildingId: string) => void;
};

export function DistrictMap({ onSelectBuilding }: DistrictMapProps) {
  const [district, setDistrict] = useState(COMMERCIAL_DISTRICTS[0].code);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {COMMERCIAL_DISTRICTS.map((d) => (
            <button
              key={d.code}
              onClick={() => setDistrict(d.code)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                district === d.code
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>공실율</span>
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
          <span>낮음</span>
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>중간</span>
          <span className="h-2 w-2 rounded-full bg-red-600" />
          <span>높음</span>
        </div>
      </div>

      <VacancyHeatmap district={district} onSelectBuilding={onSelectBuilding} />
    </div>
  );
}

export default DistrictMap;
