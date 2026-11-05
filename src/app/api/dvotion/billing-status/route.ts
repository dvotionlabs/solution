import { NextRequest, NextResponse } from 'next/server';
import { dvotionBridgeAuthorised } from '@/lib/dvotion-bridge';
import { gcConfig, gcRequest, verifyBillingSession, type BillingRequest } from '@/lib/gocardless';
import { getDvotionPlan } from '@/lib/dvotion-pricing';

export const dynamic = 'force-dynamic';

// Only the signed HttpOnly billing session is exchanged. Never expose bank details.
export async function GET(request: NextRequest) {
  if (!dvotionBridgeAuthorised(request)) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  const config = gcConfig();
  const id = config ? verifyBillingSession(request.cookies.get('cgp_billing')?.value, config.token) : null;
  if (!id) return NextResponse.json({ status: 'none' }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const data = await gcRequest(`/billing_requests/${id}`);
    const billing: BillingRequest | undefined = data.billing_requests;
    const plan = getDvotionPlan(billing?.metadata?.plan_id);
    if (!plan || billing?.metadata?.source !== 'dvotion-website'
        || billing.metadata?.amount !== String(plan.amount)
        || billing.metadata?.dvotion_service !== plan.dvotionSlug) {
      return NextResponse.json({ status: 'none' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    let subscriptionStatus: string | null = null;
    const mandate = billing.mandate_request?.links?.mandate;
    if (billing.status === 'fulfilled' && mandate && /^MD[A-Z0-9]+$/.test(mandate)) {
      const result = await gcRequest(`/subscriptions?mandate=${encodeURIComponent(mandate)}&limit=100`);
      const subscription = result.subscriptions?.find((item: { metadata?: Record<string, string> }) =>
        item.metadata?.billing_request === id && item.metadata?.plan_id === plan.id
      );
      subscriptionStatus = subscription?.status || null;
    }
    const status = subscriptionStatus === 'active' ? 'active' : billing.status === 'fulfilled' ? 'authorised' : 'pending';
    return NextResponse.json({ status, planId: plan.id, amount: plan.amount, subscriptionStatus },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to check your Direct Debit just now.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
