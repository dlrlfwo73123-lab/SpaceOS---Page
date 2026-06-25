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
  dataConfidence: 'high' | 'medium' | 'low';
  expectedMonthlyRevenue: number;
  startupCostMin: number;
  startupCostMax: number;
  paybackMonths: number;
  survivalRate3y: number;
};

export type RecommendationResult = {
  mode: 'region' | 'industry';
  generatedAt: string;
  query: {
    guCode?: string;
    guName?: string;
    dongCode?: string;
    dongName?: string;
    industryCode?: string;
    industryName?: string;
  };
  items: RecommendationItem[];
};
