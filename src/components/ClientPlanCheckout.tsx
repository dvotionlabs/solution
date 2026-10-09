'use client';

import { useState } from 'react';
import DirectDebitForm from './DirectDebitForm';
import { money } from '@/lib/pricing';

type Quote = { id: string; label: string; kind: 'monthly' | 'pack'; amount: number; perSession: number; active: boolean; paymentUrl?: string };

export default function ClientPlanCheckout() {
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [plan, setPlan] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setPlan(null);
    const normalized = code.trim().toUpperCase();
    try {
      const response = await fetch('/api/client-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: normalized }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Please try again.');
      setAppliedCode(normalized); setPlan(data.plan);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }

  return <div className="payment-panel checkout-card client-code-card">
    <p className="eyebrow">EXISTING CLIENTS</p>
    <h1 id="checkout-heading">Your coaching. Your rate.</h1>
    <form onSubmit={apply} className="client-code-form" aria-busy={busy}>
      <label htmlFor="client-code">Your client code</label>
      <div className="client-code-input"><input id="client-code" name="clientCode" value={code} onChange={e => { setCode(e.target.value); setPlan(null); setError(''); }} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={30} required placeholder="Enter your code" disabled={busy} aria-describedby={error ? 'client-code-error' : undefined} /><button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Apply'}</button></div>
      {error ? <p id="client-code-error" className="form-error" role="alert">{error}</p> : null}
    </form>
    {plan ? <div className="client-plan-result" aria-live="polite">
      <p className="client-code-applied">✓ {appliedCode} applied</p>
      <h2>{plan.label}</h2>
      <p className="checkout-price">{money(plan.amount)}<span> / {plan.kind === 'monthly' ? 'month' : 'pack'}</span></p>
      <p className="checkout-unit-price">{money(plan.perSession)} per session</p>
      {!plan.active ? <p className="client-code-date">Your new rate is ready. Return from <strong>1 December 2026</strong> to {plan.kind === 'monthly' ? 'set up this Direct Debit' : 'buy your pack'}.</p> : plan.kind === 'monthly' ? <DirectDebitForm key={plan.id} planId={plan.id} amount={money(plan.amount)} clientCode={appliedCode} /> : <>
        <a className="button" href={plan.paymentUrl}>Buy your 10-session pack <span aria-hidden="true">↗</span></a>
        <p className="checkout-secure">One-off payment securely via Stripe</p>
      </>}
    </div> : <p className="client-code-intro">Enter the code Chris gave you to see your agreed plan and price.</p>}
  </div>;
}
