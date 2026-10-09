import Link from 'next/link';
import { money, type CoachingPlan } from '@/lib/pricing';

export default function PriceCard({ plan }: { plan: CoachingPlan }) {
  const monthly = plan.kind === 'monthly';
  return <article className="price-card">
    <p className="eyebrow">{monthly ? (plan.sessions ? `DD${plan.sessions}` : 'MONTHLY COACHING') : 'PREPAID PACK'}</p>
    <h3>{plan.label}</h3>
    <p className="price-total">{money(plan.amount)}<span> / {monthly ? 'month' : 'pack'}</span></p>
    <p className="price-detail">{plan.perSession ? `${money(plan.perSession)} per session` : 'Programming, reviews and adjustments'}</p>
    <p className="price-inclusion">Free first consultation included</p>
    <Link className="button" href={monthly ? `/checkout/${plan.id}` : plan.paymentUrl!}>{monthly ? 'Set up Direct Debit' : 'Buy this pack'}<span aria-hidden="true">↗</span></Link>
    <p className="price-method">{monthly ? 'Monthly payments via GoCardless' : 'One-off payment via Stripe'}</p>
  </article>;
}
