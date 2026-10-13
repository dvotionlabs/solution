import { notFound } from 'next/navigation';
import { coaching, getPlan, money } from '@/lib/pricing';
import { getDvotionPlan } from '@/lib/dvotion-pricing';
import DirectDebitForm from '@/components/DirectDebitForm';
import { subscriptionCheckoutReady } from '@/lib/gocardless';
export const dynamic = 'force-dynamic';
export default async function Checkout({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: id } = await params;
  const dvotion = getDvotionPlan(id);
  const cgpPlan = getPlan(id);
  const plan = dvotion ?? cgpPlan;
  if (!plan || plan.kind !== 'monthly' || dvotion?.retired) notFound();
  const service = cgpPlan ? coaching.find(c => c.slug === cgpPlan.coaching) : null;
  if (!dvotion && !service) notFound();
  const back = dvotion ? `https://dvotionlabs.com${dvotion.returnPath}` : `/coaching/${service!.slug}`;
  const title = dvotion ? dvotion.serviceName : service!.title;
  return (
    <section className="checkout-page" aria-labelledby="checkout-heading">
      <a className="checkout-back" href={back}>← Change plan</a>
      <div className="payment-panel checkout-card">
        <p className="eyebrow">{dvotion ? 'DVOTION LABS / COACHING PAYMENTS' : title}</p>
        {dvotion ? <p className="payment-note">Coaching delivered by DVOTION Labs. Direct Debit collected by CG Performance through GoCardless.</p> : null}
        <h1 id="checkout-heading">{dvotion ? `${title} — ${plan.label}` : plan.label}</h1>
        <p className="checkout-price">{money(plan.amount)}<span> / month</span></p>
        {plan.perSession ? <p className="checkout-unit-price">{money(plan.perSession)} per session</p> : null}
        {dvotion?.sessionsPerMonth ? <p className="payment-note">DD{dvotion.sessionsPerMonth} includes exactly {dvotion.sessionsPerMonth} one-to-one sessions per month at {money(dvotion.perSession!)} per session. The monthly Direct Debit is {money(plan.amount)}. Session times and locations are agreed with your coach.</p> : null}
        {dvotion?.requiresAssessment ? <p className="payment-note">Movement Restoration Coaching requires a completed DVOTION Biomechanical Assessment, booked and paid for separately before coaching begins.</p> : null}
        {!dvotion ? <p className="checkout-inclusion"><span aria-hidden="true">✓</span> Free first consultation included</p> : null}
        {!dvotion && cgpPlan?.coaching === 'in-person' ? <a className="checkout-client-link" href="/client-pricing">Have a client code?</a> : null}
        {subscriptionCheckoutReady() ? (
          <DirectDebitForm planId={plan.id} amount={money(plan.amount)} showReferral={!dvotion} />
        ) : (
          <p className="payment-note">Online setup is temporarily unavailable. <a href="mailto:chrisgkoufas.performance@gmail.com">Contact Chris to get started</a>.</p>
        )}
      </div>
      <details className="checkout-existing">
        <summary>Already paying for coaching?</summary>
        <p>If you have an existing Stripe or GoCardless coaching subscription, contact Chris before starting a new mandate to avoid overlapping payments. This signup does not cancel existing subscriptions.</p>
      </details>
      <p className="checkout-help">Monthly collections start after your GoCardless mandate is authorised. Cancellation of DVOTION coaching requires 30 days' written notice. <a href={dvotion?'https://dvotionlabs.com/cancellation-policy':'/privacy'}>{dvotion?'DVOTION cancellation policy':'Privacy'}</a> · <a href="/privacy">Payment privacy</a> · <a href="mailto:chrisgkoufas.performance@gmail.com">Contact Chris</a>.</p>
    </section>
  );
}
