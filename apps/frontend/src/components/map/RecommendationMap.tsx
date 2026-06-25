import { NaverMap } from '@/components/NaverMap';
import { DongPolygonLayer } from './DongPolygonLayer';
import { BuildingMarkerLayer } from './BuildingMarkerLayer';

type Props = {
  guCode: string;
  dongCode?: string;
  industryCode?: string;
  onSelectBuilding?: (id: string) => void;
};

export function RecommendationMap({ guCode, dongCode = '', industryCode = 'ALL', onSelectBuilding }: Props) {
  return (
    <div className="relative">
      <NaverMap guCode={guCode} dongCode={dongCode} industryCode={industryCode} onSelectBuilding={onSelectBuilding} />
      <DongPolygonLayer />
      <BuildingMarkerLayer />
    </div>
  );
}
