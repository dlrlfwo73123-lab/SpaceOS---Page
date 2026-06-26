import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecommendationCard } from './RecommendationCard';
import type { RecommendationItem } from '@/types/recommendation';

const baseItem: RecommendationItem = {
  id: 'item-1',
  rank: 1,
  guCode: '11680',
  guName: '강남구',
  dongCode: '11680108',
  dongName: '역삼동',
  industryCode: 'F45',
  industryName: '음식점',
  totalScore: 82,
  breakdown: [{ label: '수요', score: 80, weight: 0.22 }],
  evidences: ['요약입니다'],
  risks: ['위험 요소입니다'],
  dataLimitations: ['데이터 제한 사항입니다'],
  dataConfidence: 'low',
  isDemo: true,
  expectedMonthlyRevenue: 12000000,
  rentPer33: 9.5,
  survivalRate3y: 52,
};

describe('RecommendationCard', () => {
  it('shows the 데모 데이터 badge when isDemo is true', () => {
    render(<RecommendationCard item={baseItem} mode="region" />);
    expect(screen.getByText('데모 데이터')).toBeInTheDocument();
  });

  it('does not show the 데모 데이터 badge when isDemo is false', () => {
    render(<RecommendationCard item={{ ...baseItem, isDemo: false }} mode="region" />);
    expect(screen.queryByText('데모 데이터')).not.toBeInTheDocument();
  });

  it('renders the total score and title', () => {
    render(<RecommendationCard item={baseItem} mode="region" />);
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('음식점')).toBeInTheDocument();
  });
});
