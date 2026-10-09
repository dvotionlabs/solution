import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EnquiryForm from '@/components/EnquiryForm';
import { coaching, plans, money, type CoachingPlan } from '@/lib/pricing';

export function generateStaticParams() { return coaching.map(c => ({ format: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ format: string }> }): Promise<Metadata> {
  const { format } = await params;
  return { title: coaching.find(c => c.slug === format)?.title ?? 'Coaching' };
}
function PriceCard({ plan }: { plan: CoachingPlan }) {
  const monthly = plan.kind === 'monthly';
  return <article className="price-card">
    <p className="eyebrow">{monthly ? (plan.sessions ? `DD${plan.sessions}` : 'MONTHLY COACHING') : 'PREPAID PACK'}</p>
    <h3>{plan.label}</h3>
    <p className="price-total">{money(plan.amount)}<span> / {monthly ? 'month' : 'pack'}</span></p>
    <p className="price-detail">{plan.perSession ? `${money(plan.perSession)} per session` : 'Programming, reviews and adjustments'}</p>
    <p className="price-inclusion">Free initial consultation and assessment</p>
    <Link className="button" href={monthly ? `/checkout/${plan.id}` : plan.paymentUrl!}>{monthly ? 'Set up Direct Debit' : 'Buy this pack'}<span aria-hidden="true">↗</span></Link>
    <p className="price-method">{monthly ? 'Monthly payments via GoCardless' : 'One-off payment via Stripe'}</p>
  </article>;
}
export default async function CoachingPage({ params }: { params: Promise<{ format: string }> }) {
  const { format } = await params;
  const service = coaching.find(c => c.slug === format);
  if (!service) notFound();
  const monthly = plans.filter(p => p.coaching === format && p.kind === 'monthly');
  const packs = plans.filter(p => p.coaching === format && p.kind === 'pack');
  return <>
    <section className="wrap pricing-intro">
      <Link className="back-link" href="/#coaching">← All coaching options</Link>
      <nav className="coaching-tabs" aria-label="Coaching format">{coaching.map(c => <Link key={c.slug} href={`/coaching/${c.slug}`} aria-current={c.slug === format ? 'page' : undefined}>{c.short}</Link>)}</nav>
      <p className="eyebrow">{service.eyebrow}</p>
      <div className="pricing-heading"><h1>{service.title}.</h1><p>{service.description}</p></div>
      <ul className="coaching-benefits">{service.benefits.map(b => <li key={b}><span aria-hidden="true">↗</span>{b}</li>)}</ul>
      <div className="consultation-strip"><div><strong>Start with a free consultation and assessment.</strong><p>We’ll discuss your goals, look at your starting point and agree how to move forward.</p></div><a className="text-link" href="#consultation">Arrange yours <span aria-hidden="true">↗</span></a></div>
    </section>
    <section className="wrap pricing-section" aria-labelledby="monthly-heading"><div className="pricing-section-heading"><h2 id="monthly-heading">Build consistency.</h2><p>Monthly coaching, paid by Direct Debit.</p></div><div className={`price-grid${monthly.length === 1 ? ' price-grid-single' : ''}`}>{monthly.map(p => <PriceCard key={p.id} plan={p} />)}</div><p className="pricing-note">Monthly plans renew automatically. The amount and payment schedule are shown before you confirm. To discuss a change or cancellation, contact Chris.</p></section>
    {packs.length > 0 && <section className="wrap pricing-section" aria-labelledby="packs-heading"><div className="pricing-section-heading"><h2 id="packs-heading">Prefer a pack?</h2><p>Pay once for 10 or 20 sessions.</p></div><div className="price-grid price-grid-packs">{packs.map(p => <PriceCard key={p.id} plan={p} />)}</div></section>}
    <section id="consultation" className="contact-section"><div className="wrap contact-grid section-space"><div><p className="eyebrow">YOUR FIRST STEP</p><h2>Let’s find your<br />starting point.</h2><p>Your initial consultation and assessment are free. Tell me what you’re working towards and I’ll be in touch to arrange a time.</p><a className="contact-email" href="mailto:chrisgkoufas.performance@gmail.com">chrisgkoufas.performance@gmail.com ↗</a></div><EnquiryForm initialCoaching={service.enquiry} consultation /></div></section>
  </>;
}
