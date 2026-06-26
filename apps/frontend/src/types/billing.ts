export type PlanId = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'none';

export type PlanFeature = {
  key: string;
  label: string;
  included: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthlyKrw: number;
  isDemoPricing: boolean;
  features: PlanFeature[];
  monthlyAnalysisQuota: number | null;
};

export type Entitlements = {
  planId: PlanId;
  status: SubscriptionStatus;
  isDemo: boolean;
  monthlyAnalysisQuota: number | null;
  analysesUsedThisMonth: number;
  paymentEnabled: boolean;
  note: string;
};
