import { getPlan, type CoachingPlan } from './pricing.ts';

// Server-only configuration. Never import this module into a client component.
// Keep existing entries immutable: provider webhooks may arrive after a price update.
export const CLIENT_PRICING_START = '2026-12-01T00:00:00Z';
export type ClientPlan = CoachingPlan & { clientCode: string; basePlanId: string };

function clientPlans(): ClientPlan[] {
  try {
    const entries: unknown = JSON.parse(process.env.CGP_CLIENT_PLANS || '[]');
    if (!Array.isArray(entries) || entries.length > 200) return [];
    const result: ClientPlan[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') return [];
      const { id, code, basePlanId, amount, paymentUrl, paymentLinkId } = entry;
      const base = getPlan(basePlanId);
      if (!base || !base.sessions || !/^client-[a-z0-9-]{1,60}$/.test(id) ||
          typeof code !== 'string' || !/^[A-Z]{3,30}$/.test(code) ||
          !Number.isSafeInteger(amount) || amount <= 0 || amount > base.amount || amount % base.sessions !== 0 ||
          result.some(p => p.id === id || p.clientCode === code)) return [];
      if (base.kind === 'pack' && (typeof paymentUrl !== 'string' ||
          !/^https:\/\/buy\.stripe\.com\/[a-zA-Z0-9]+$/.test(paymentUrl) ||
          typeof paymentLinkId !== 'string' || !/^plink_[a-zA-Z0-9]+$/.test(paymentLinkId))) return [];
      result.push({ ...base, id, clientCode: code, basePlanId, amount, perSession: amount / base.sessions,
        ...(base.kind === 'pack' ? { paymentUrl, paymentLinkId } : {}) });
    }
    return result;
  } catch { return []; }
}

export function resolveClientCode(code: unknown) {
  if (typeof code !== 'string' || code.length > 40) return undefined;
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{3,30}$/.test(normalized)) return undefined;
  return clientPlans().find(p => p.clientCode === normalized);
}

// Provider callbacks use the trusted, server-created plan ID, never a supplied amount.
export function getPaymentPlan(id: unknown): CoachingPlan | undefined {
  return getPlan(id) ?? (typeof id === 'string' ? clientPlans().find(p => p.id === id) : undefined);
}

export function clientPricingActive(now = Date.now()) {
  return now >= Date.parse(CLIENT_PRICING_START);
}

export function authorizedClientPlan(id: unknown, code: unknown, now = Date.now()) {
  const plan = resolveClientCode(code);
  return plan?.id === id && clientPricingActive(now) ? plan : undefined;
}

export function clientPlanQuote(code: unknown, now = Date.now()) {
  const plan = resolveClientCode(code);
  if (!plan) return null;
  const active = clientPricingActive(now);
  return { id: plan.id, label: plan.label, kind: plan.kind, sessions: plan.sessions,
    amount: plan.amount, perSession: plan.perSession, active, availableFrom: CLIENT_PRICING_START,
    ...(active && plan.kind === 'pack' ? { paymentUrl: plan.paymentUrl } : {}) };
}
