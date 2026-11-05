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
  sessionsPerWeek: number | null; // historical agreement only (retired weekly plans)
  sessionsPerMonth?: number; // DD4 / DD8 / DD12 exact monthly allocations
  retired?: boolean; // preserves old mandate records, disallows fresh subscriptions
  perSession: number | null; // GBP pence
  requiresAssessment?: boolean;
};

// New DVOTION subscription IDs preserve existing authorised payment amounts.
// The new rates apply to new signups only. Historical DD and weekly IDs stay
// immutable for payment webhooks, and retired plans cannot be purchased.
// Movement Restoration is publicly offered as four in-person sessions per month
// with individual programming. Higher-frequency plans are no longer advertised.
// DVOTION prices are independent of CG Performance's personal training rates.
export const dvotionPlans: readonly DvotionPlan[] = [
  { id: 'dvotion-performance-dd4-v3', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-4', returnPath: '/strength-conditioning-coaching-london', amount: 48000, label: 'DD4 · 4 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 4, perSession: 12000 },
  { id: 'dvotion-performance-dd4-v2', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-4', returnPath: '/strength-conditioning-coaching-london', amount: 46000, label: 'DD4 · 4 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 4, perSession: 11500 },
  { id: 'dvotion-performance-dd4', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-4', returnPath: '/strength-conditioning-coaching-london', amount: 50000, label: 'DD4 · 4 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 4, perSession: 12500 },
  { id: 'dvotion-performance-dd8-v3', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-8', returnPath: '/strength-conditioning-coaching-london', amount: 92000, label: 'DD8 · 8 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 8, perSession: 11500 },
  { id: 'dvotion-performance-dd8-v2', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-8', returnPath: '/strength-conditioning-coaching-london', amount: 88000, label: 'DD8 · 8 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 8, perSession: 11000 },
  { id: 'dvotion-performance-dd8', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-8', returnPath: '/strength-conditioning-coaching-london', amount: 96000, label: 'DD8 · 8 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 8, perSession: 12000 },
  { id: 'dvotion-performance-dd12-v3', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-12', returnPath: '/strength-conditioning-coaching-london', amount: 132000, label: 'DD12 · 12 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 12, perSession: 11000 },
  { id: 'dvotion-performance-dd12-v2', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-12', returnPath: '/strength-conditioning-coaching-london', amount: 126000, label: 'DD12 · 12 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 12, perSession: 10500 },
  { id: 'dvotion-performance-dd12', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-12', returnPath: '/strength-conditioning-coaching-london', amount: 138000, label: 'DD12 · 12 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 12, perSession: 11500 },
  { id: 'dvotion-movement-dd4-v3', kind: 'monthly', source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration', returnPath: '/movement-restoration-coaching-london', amount: 70000, label: '4 in-person sessions per month + individual programming', sessionsPerWeek: null, sessionsPerMonth: 4, perSession: 17500, requiresAssessment: true },
  { id: 'dvotion-movement-dd4-v2', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration', returnPath: '/movement-restoration-coaching-london', amount: 46000, label: 'DD4 · 4 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 4, perSession: 11500, requiresAssessment: true },
  { id: 'dvotion-movement-dd4', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration', returnPath: '/movement-restoration-coaching-london', amount: 56000, label: 'DD4 · 4 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 4, perSession: 14000, requiresAssessment: true },
  { id: 'dvotion-movement-dd8-v2', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-8', returnPath: '/movement-restoration-coaching-london', amount: 88000, label: 'DD8 · 8 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 8, perSession: 11000, requiresAssessment: true },
  { id: 'dvotion-movement-dd8', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-8', returnPath: '/movement-restoration-coaching-london', amount: 108000, label: 'DD8 · 8 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 8, perSession: 13500, requiresAssessment: true },
  { id: 'dvotion-movement-dd12-v2', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-12', returnPath: '/movement-restoration-coaching-london', amount: 126000, label: 'DD12 · 12 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 12, perSession: 10500, requiresAssessment: true },
  { id: 'dvotion-movement-dd12', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-12', returnPath: '/movement-restoration-coaching-london', amount: 150000, label: 'DD12 · 12 sessions per month', sessionsPerWeek: null, sessionsPerMonth: 12, perSession: 12500, requiresAssessment: true },
  // Historical versions: retained ONLY to validate already-issued Billing Requests.
  { id: 'dvotion-performance-1', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-4', returnPath: '/strength-conditioning-coaching-london', amount: 54167, label: '1 session per week', retired: true, sessionsPerWeek: 1, perSession: 12500 },
  { id: 'dvotion-performance-2', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-8', returnPath: '/strength-conditioning-coaching-london', amount: 104000, label: '2 sessions per week', retired: true, sessionsPerWeek: 2, perSession: 12000 },
  { id: 'dvotion-performance-3', kind: 'monthly', source: 'dvotion-website', serviceName: 'S&C, Hypertrophy & Performance Coaching', dvotionSlug: 'in-person-coaching-12', returnPath: '/strength-conditioning-coaching-london', amount: 149500, label: '3 sessions per week', retired: true, sessionsPerWeek: 3, perSession: 11500 },
  { id: 'dvotion-movement-1', kind: 'monthly', source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration', returnPath: '/movement-restoration-coaching-london', amount: 60667, label: '1 session per week', retired: true, sessionsPerWeek: 1, perSession: 14000, requiresAssessment: true },
  { id: 'dvotion-movement-2', kind: 'monthly', source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-8', returnPath: '/movement-restoration-coaching-london', amount: 117000, label: '2 sessions per week', retired: true, sessionsPerWeek: 2, perSession: 13500, requiresAssessment: true },
  { id: 'dvotion-movement-3', kind: 'monthly', source: 'dvotion-website', serviceName: 'Movement Restoration Coaching', dvotionSlug: 'movement-restoration-12', returnPath: '/movement-restoration-coaching-london', amount: 162500, label: '3 sessions per week', retired: true, sessionsPerWeek: 3, perSession: 12500, requiresAssessment: true },
  { id: 'dvotion-training-app', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'DVOTION Training App', dvotionSlug: 'dvotion-training-app', returnPath: '/coaching', amount: 5000, label: 'Monthly app coaching', sessionsPerWeek: null, perSession: null },
  { id: 'dvotion-endurance-online', kind: 'monthly', source: 'dvotion-website', serviceName: 'Online Endurance Coaching', dvotionSlug: 'endurance-coaching', returnPath: '/online-coaching', amount: 15000, label: 'Online endurance coaching', sessionsPerWeek: null, perSession: null },
  { id: 'dvotion-online-performance-v2', kind: 'monthly', source: 'dvotion-website', serviceName: 'Online Performance Coaching', dvotionSlug: 'online-coaching', returnPath: '/online-coaching', amount: 20000, label: 'Online strength, movement and performance coaching', sessionsPerWeek: null, perSession: null },
  { id: 'dvotion-endurance-performance-online', kind: 'monthly', retired: true, source: 'dvotion-website', serviceName: 'Online Endurance and Performance Coaching', dvotionSlug: 'online-coaching', returnPath: '/online-coaching', amount: 28500, label: 'Combined online coaching', sessionsPerWeek: null, perSession: null },
];
export function getDvotionPlan(id: unknown): DvotionPlan | undefined {
  return typeof id === 'string' ? dvotionPlans.find(p => p.id === id) : undefined;
}
export function isDvotionPlan(value: unknown): value is DvotionPlan {
  return !!value && typeof value === 'object' && 'source' in value && value.source === 'dvotion-website';
}
