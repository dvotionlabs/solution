// DVOTION-specific services billed by CG Performance via the existing GoCardless
// account. These IDs are intentionally separate from CG Performance's own plans.
// A completed Billing Request retains its agreed ID and amount permanently.
export type DvotionPlan = {
  id: string;
  kind: 'monthly';
  source: 'dvotion-website';
  serviceName: string;
  dvotionSlug: string;
  returnPath: string;
  amount: number; // GBP pence, monthly
  label: string;
  sessionsPerWeek: number | null;
  perSession: number | null; // GBP pence
  requiresAssessment?: boolean;
};

// In-person plans: session rate × sessions/week × 52 weeks ÷ 12 collections.
// Values are rounded once to the nearest penny. Online prices are unchanged.
export const dvotionPlans: readonly DvotionPlan[] = [
  { id: 'dvotion-performance-1', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-4', returnPath: '/strength-conditioning-coaching-london', amount: 54167, label: '1 session per week', sessionsPerWeek: 1, perSession: 12500 },
  { id: 'dvotion-performance-2', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-8', returnPath: '/strength-conditioning-coaching-london', amount: 104000, label: '2 sessions per week', sessionsPerWeek: 2, perSession: 12000 },
  { id: 'dvotion-performance-3', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-12', returnPath: '/strength-conditioning-coaching-london', amount: 149500, label: '3 sessions per week', sessionsPerWeek: 3, perSession: 11500 },
  { id: 'dvotion-movement-1', kind: 'monthly', source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration', returnPath: '/movement-restoration-coaching-london', amount: 60667, label: '1 session per week', sessionsPerWeek: 1, perSession: 14000, requiresAssessment: true },
  { id: 'dvotion-movement-2', kind: 'monthly', source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-8', returnPath: '/movement-restoration-coaching-london', amount: 117000, label: '2 sessions per week', sessionsPerWeek: 2, perSession: 13500, requiresAssessment: true },
  { id: 'dvotion-movement-3', kind: 'monthly', source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-12', returnPath: '/movement-restoration-coaching-london', amount: 162500, label: '3 sessions per week', sessionsPerWeek: 3, perSession: 12500, requiresAssessment: true },
  { id: 'dvotion-training-app', kind: 'monthly', source: 'dvotion-website', serviceName: 'DVOTION Training App', dvotionSlug: 'dvotion-training-app', returnPath: '/coaching', amount: 5000, label: 'Monthly app coaching', sessionsPerWeek: null, perSession: null },
  { id: 'dvotion-endurance-online', kind: 'monthly', source: 'dvotion-website', serviceName: 'Online Endurance Coaching', dvotionSlug: 'endurance-coaching', returnPath: '/online-coaching', amount: 15000, label: 'Online endurance coaching', sessionsPerWeek: null, perSession: null },
  { id: 'dvotion-endurance-performance-online', kind: 'monthly', source: 'dvotion-website', serviceName: 'Online Endurance and Performance Coaching', dvotionSlug: 'online-coaching', returnPath: '/online-coaching', amount: 28500, label: 'Combined online coaching', sessionsPerWeek: null, perSession: null },
];
export function getDvotionPlan(id: unknown): DvotionPlan | undefined {
  return typeof id === 'string' ? dvotionPlans.find(p => p.id === id) : undefined;
}
export function isDvotionPlan(value: unknown): value is DvotionPlan {
  return !!value && typeof value === 'object' && 'source' in value && value.source === 'dvotion-website';
}
