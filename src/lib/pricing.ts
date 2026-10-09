export type CoachingSlug = 'in-person' | 'virtual' | 'online';
export type CoachingPlan = { id: string; coaching: CoachingSlug; kind: 'monthly' | 'pack'; sessions: number | null; amount: number; perSession: number | null; label: string; paymentUrl?: string; paymentLinkId?: string };

export const coaching = [
  { slug: 'in-person' as const, title: 'In-person coaching', short: 'In person', eyebrow: 'SIDE BY SIDE', description: 'One-to-one strength and movement coaching in London or St Albans. A considered plan, close attention to how you move and progress you can build on.', benefits: ['Individual strength and movement coaching', 'Sessions in a setting agreed together', 'Ongoing adjustments as you progress'], enquiry: 'in_person' },
  { slug: 'virtual' as const, title: 'Virtual coaching', short: 'Virtual', eyebrow: 'COACHING, WHEREVER YOU ARE', description: 'Train with me live by video from your own gym or home. Real-time guidance, movement feedback and a session shaped around you.', benefits: ['Live, one-to-one video sessions', 'Coaching with the equipment available to you', 'Real-time feedback throughout your session'], enquiry: 'live_online' },
  { slug: 'online' as const, title: 'Online coaching', short: 'Online', eyebrow: 'YOUR PROGRAMME. YOUR PACE.', description: 'An individual training programme to follow in your own time. Clear direction, regular reviews and adjustments as your training develops.', benefits: ['A programme built around your goals', 'Train in your own time and setting', 'Regular reviews and programme adjustments'], enquiry: 'online_programming' },
];

export const plans: readonly CoachingPlan[] = [
  { id: 'in-person-dd4', coaching: 'in-person', kind: 'monthly', sessions: 4, amount: 46000, perSession: 11500, label: '4 sessions a month' },
  { id: 'in-person-dd8', coaching: 'in-person', kind: 'monthly', sessions: 8, amount: 88000, perSession: 11000, label: '8 sessions a month' },
  { id: 'in-person-dd12', coaching: 'in-person', kind: 'monthly', sessions: 12, amount: 126000, perSession: 10500, label: '12 sessions a month' },
  { id: 'in-person-pack10', coaching: 'in-person', kind: 'pack', sessions: 10, amount: 115000, perSession: 11500, label: '10-session pack', paymentUrl: 'https://buy.stripe.com/7sY5kw1fjeqz3AB6hz5ZC0f', paymentLinkId: 'plink_1UOkGu2MuOMFBF7sZ9r1f0pI' },
  { id: 'in-person-pack20', coaching: 'in-person', kind: 'pack', sessions: 20, amount: 220000, perSession: 11000, label: '20-session pack', paymentUrl: 'https://buy.stripe.com/14A28kf694PZ2wx35n5ZC0g', paymentLinkId: 'plink_1UOkGz2MuOMFBF7s3Qc4tlUC' },
  { id: 'virtual-dd4', coaching: 'virtual', kind: 'monthly', sessions: 4, amount: 42000, perSession: 10500, label: '4 sessions a month' },
  { id: 'virtual-dd8', coaching: 'virtual', kind: 'monthly', sessions: 8, amount: 80000, perSession: 10000, label: '8 sessions a month' },
  { id: 'virtual-dd12', coaching: 'virtual', kind: 'monthly', sessions: 12, amount: 114000, perSession: 9500, label: '12 sessions a month' },
  { id: 'virtual-pack10', coaching: 'virtual', kind: 'pack', sessions: 10, amount: 105000, perSession: 10500, label: '10-session pack', paymentUrl: 'https://buy.stripe.com/6oU3cobTXcirc7735n5ZC0h', paymentLinkId: 'plink_1UOkH42MuOMFBF7s0jc6YJgm' },
  { id: 'virtual-pack20', coaching: 'virtual', kind: 'pack', sessions: 20, amount: 200000, perSession: 10000, label: '20-session pack', paymentUrl: 'https://buy.stripe.com/cNi8wIe25bendbbcFX5ZC0i', paymentLinkId: 'plink_1UOkH92MuOMFBF7sJzjLr1uA' },
  { id: 'online-monthly', coaching: 'online', kind: 'monthly', sessions: null, amount: 16500, perSession: null, label: 'Individual online coaching' },
];
export const getPlan = (id: unknown) => typeof id === 'string' ? plans.find(p => p.id === id) : undefined;
export const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(pence / 100);
