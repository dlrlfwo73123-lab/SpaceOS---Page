// Mirrors apps/backend/app/schemas/provenance.py's DataProvenance.
// Every sub-score is null/0 and isDemo is always true for mock-sourced
// metrics — there is no live adapter wired up anywhere in this pass.
export type DataProvenance = {
  metricKey: string;
  sourceId: string;
  isDemo: boolean;
  asOf: string | null;
  confidence: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  sourceReliability: number | null;
  freshnessScore: number | null;
  completenessScore: number | null;
  coverageScore: number | null;
  spatialAccuracyScore: number | null;
  consistencyScore: number | null;
  dataLimitations: string[];
};
