// PRICING_HYPOTHESIS_V1 — a draft pricing structure for evaluation, not a
// live billing configuration. No payment provider is wired up; every tier's
// CTA must stay disabled with a "결제 연동 준비 중" label until one is.
export type PricingTier = {
  id: string;
  name: string;
  monthlyPriceWon: number | null; // null = "문의" (contact sales)
  description: string;
  features: string[];
};

export const PRICING_HYPOTHESIS_V1: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPriceWon: 0,
    description: '데모 데이터로 추천 흐름을 체험해보세요.',
    features: ['지역/업종 추천 결과 조회 (데모 데이터)', '대시보드 기본 지표 열람'],
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceWon: 19900,
    description: '소규모 창업 준비자를 위한 기본 분석.',
    features: ['Free 기능 전체', '추천 결과 저장 (예정)', '데이터 출처 상세 보기'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPriceWon: 49000,
    description: '여러 입지를 비교하는 예비 창업자용.',
    features: ['Starter 기능 전체', '추천 비교 (예정)', '우선 지원'],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPriceWon: 149000,
    description: '다점포 운영/중개 업무용.',
    features: ['Pro 기능 전체', '팀 계정 (예정)', 'API 연동 (예정)'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPriceWon: null,
    description: '대규모 데이터 연동이 필요한 조직용.',
    features: ['Business 기능 전체', '전담 매니저', '맞춤 데이터 연동 협의'],
  },
];
