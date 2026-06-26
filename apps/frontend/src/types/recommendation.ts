export type ScoreBreakdownItem = {
  label: string;
  score: number; // 0~100
  weight: number; // 0~1
};

export type RecommendationItem = {
  id: string;
  rank: number;
  guCode: string;
  guName: string;
  dongCode: string;
  dongName: string;
  industryCode: string;
  industryName: string;
  totalScore: number;
  breakdown: ScoreBreakdownItem[];
  evidences: string[];
  risks: string[];
  dataLimitations: string[];
  dataConfidence: 'high' | 'medium' | 'low';
  isDemo: boolean;
  expectedMonthlyRevenue: number;
  rentPer33: number;
  survivalRate3y: number;
};

export type RecommendationStatus = 'success' | 'partial' | 'insufficient_data' | 'stale' | 'error';

export type RecommendationResult = {
  analysisId: string;
  mode: 'region' | 'industry';
  status: RecommendationStatus;
  generatedAt: string;
  isDemo: boolean;
  query: {
    guCode?: string;
    guName?: string;
    dongCode?: string;
    dongName?: string;
    industryCode?: string;
    industryName?: string;
  };
  items: RecommendationItem[];
  missingMetrics: string[];
  warnings: string[];
};
