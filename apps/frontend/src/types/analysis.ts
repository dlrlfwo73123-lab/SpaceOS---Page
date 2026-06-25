export type AnalysisMode = 'region' | 'industry';

export type BusinessCondition = {
  budgetMin: number; // 만원
  budgetMax: number; // 만원
  areaSqm: number;
  priorExperience: boolean;
};

export type RegionAnalysisInput = {
  guCode: string;
  dongCode: string;
  condition: BusinessCondition;
};

export type IndustryAnalysisInput = {
  industryCode: string;
  condition: BusinessCondition;
};
