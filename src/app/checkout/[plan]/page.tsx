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
  return (
    <section className="checkout-page" aria-labelledby="checkout-heading">
      <a className="checkout-back" href={`/coaching/${service.slug}`}>← Change plan</a>
      <div className="payment-panel checkout-card">
        <p className="eyebrow">{service.title}</p>
        <h1 id="checkout-heading">{plan.label}</h1>
        <p className="checkout-price">{money(plan.amount)}<span> / month</span></p>
        {plan.perSession ? <p className="checkout-unit-price">{money(plan.perSession)} per session</p> : null}
        <p className="checkout-inclusion"><span aria-hidden="true">✓</span> Free first consultation included</p>
        {plan.coaching === 'in-person' ? <a className="checkout-client-link" href="/client-pricing">Have a client code?</a> : null}
        {subscriptionCheckoutReady() ? (
          <DirectDebitForm planId={plan.id} amount={money(plan.amount)} />
        ) : (
          <p className="payment-note">Online setup is temporarily unavailable. <a href="mailto:chrisgkoufas.performance@gmail.com">Contact Chris to get started</a>.</p>
        )}
      </div>
      <details className="checkout-existing">
        <summary>Already paying for coaching?</summary>
        <p>Paying through Wix or another plan? <a href="mailto:chrisgkoufas.performance@gmail.com">Contact Chris</a> before signing up to arrange your changeover and avoid overlapping payments.</p>
      </details>
      <p className="checkout-help">To change or cancel, <a href="mailto:chrisgkoufas.performance@gmail.com">contact Chris</a>. <a href="/privacy">Privacy</a></p>
    </section>
  );
}
