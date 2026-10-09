import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EnquiryForm from '@/components/EnquiryForm';
import { coaching, plans } from '@/lib/pricing';
import PriceCard from '@/components/PriceCard';

export function generateStaticParams() { return coaching.map(c => ({ format: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ format: string }> }): Promise<Metadata> {
  const { format } = await params;
  return { title: coaching.find(c => c.slug === format)?.title ?? 'Coaching' };
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
      <div className="purchase-actions"><a className="button" href="#monthly">Choose a monthly plan <span aria-hidden="true">↓</span></a>{packs.length > 0 ? <a className="button button-secondary" href="#packs">Buy a session pack <span aria-hidden="true">↓</span></a> : null}<a className="text-link" href="#consultation">Free consultation <span aria-hidden="true">↗</span></a></div><p className="pricing-note">Sign up straight away, or arrange a free consultation first. We’ll discuss your goals, experience, lifestyle and any limitations.</p>
    </section>
    <section id="monthly" className="wrap pricing-section" aria-labelledby="monthly-heading"><div className="pricing-section-heading"><h2 id="monthly-heading">Build consistency.</h2><p>Monthly coaching, paid by Direct Debit.</p></div><div className={`price-grid${monthly.length === 1 ? ' price-grid-single' : ''}`}>{monthly.map(p => <PriceCard key={p.id} plan={p} />)}</div><p className="pricing-note">Monthly plans renew automatically. The amount and payment schedule are shown before you confirm. To discuss a change or cancellation, contact Chris.</p></section>
    <div className="wrap"><p className="pricing-note referral-pricing-note">Referred by a current client? When you join a monthly Direct Debit plan, they receive 50% off one month of training. <a href="/referrals">How referrals work ↗</a></p></div>
    {packs.length > 0 && <section id="packs" className="wrap pricing-section" aria-labelledby="packs-heading"><div className="pricing-section-heading"><h2 id="packs-heading">Prefer a pack?</h2><p>Pay once for 10 or 20 sessions.</p></div><div className="price-grid price-grid-packs">{packs.map(p => <PriceCard key={p.id} plan={p} />)}</div></section>}
    <section id="consultation" className="contact-section"><div className="wrap contact-grid section-space"><div><p className="eyebrow">YOUR FIRST STEP</p><h2>Your first<br />appointment is free.</h2><p>We’ll talk through your goals, past training experiences, lifestyle and any limitations. Leave your details and I’ll be in touch to arrange a time.</p><a className="contact-email" href="mailto:chrisgkoufas.performance@gmail.com">chrisgkoufas.performance@gmail.com ↗</a></div><EnquiryForm initialCoaching={service.enquiry} consultation /></div></section>
  </>;
}
