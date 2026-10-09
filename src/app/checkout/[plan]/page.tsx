import { notFound } from 'next/navigation';
import { coaching, getPlan, money } from '@/lib/pricing';
import DirectDebitForm from '@/components/DirectDebitForm';
import { subscriptionCheckoutReady } from '@/lib/gocardless';
export const dynamic = 'force-dynamic';
export default async function Checkout({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: id } = await params;
  const plan = getPlan(id);
  if (!plan || plan.kind !== 'monthly') notFound();
  const service = coaching.find(c => c.slug === plan.coaching)!;
  return <section className="simple-page"><a className="back-link" href={`/coaching/${service.slug}`}>← Back to {service.short.toLowerCase()} coaching</a><p className="eyebrow">YOUR COACHING PLAN</p><h1>{service.title}.</h1><div className="payment-panel"><h2>{plan.label}</h2><p className="checkout-total">{money(plan.amount)}<span> / month</span></p>{plan.perSession && <p>{money(plan.perSession)} per session</p>}<p>Includes your free initial consultation and assessment.</p><p>After you authorise your Direct Debit, your subscription will start automatically. Your first payment is collected on the earliest date available through GoCardless, then monthly until cancelled. GoCardless will confirm the collection dates by email.</p><p>To change or cancel your coaching, <a href="mailto:chrisgkoufas.performance@gmail.com">contact Chris</a>.</p>{subscriptionCheckoutReady() ? <DirectDebitForm planId={plan.id} amount={money(plan.amount)} /> : <p className="payment-note">Direct Debit checkout is being connected. <a href={`/coaching/${service.slug}#consultation`}>Arrange your free consultation</a> and Chris will help you get started.</p>}</div><p className="payment-note">Already paying through Wix or another plan? Contact Chris to agree your changeover before starting a new subscription.</p><p className="payment-note">Your bank details are entered securely on GoCardless. <a href="/privacy">Privacy policy</a>.</p></section>;
}
