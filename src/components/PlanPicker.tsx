'use client';

import { useState } from 'react';
import { coaching, plans, type CoachingSlug } from '@/lib/pricing';
import PriceCard from './PriceCard';

export default function PlanPicker() {
  const [format, setFormat] = useState<CoachingSlug>('in-person');
  const monthly = plans.filter(plan => plan.coaching === format && plan.kind === 'monthly');
  const packs = plans.filter(plan => plan.coaching === format && plan.kind === 'pack');
  return <>
    <div className="coaching-tabs plan-picker-tabs" role="group" aria-label="Choose your coaching format">
      {coaching.map(service => <button key={service.slug} type="button" aria-pressed={format === service.slug} onClick={() => setFormat(service.slug)}>{service.short}</button>)}
    </div>
    <div className="pricing-section-heading"><h3>Monthly Direct Debit</h3><p>Choose your plan and set up monthly payments.</p></div>
    <div className={`price-grid${monthly.length === 1 ? ' price-grid-single' : ''}`}>{monthly.map(plan => <PriceCard key={plan.id} plan={plan} />)}</div>
    {packs.length > 0 ? <div className="picker-packs">
      <div className="pricing-section-heading"><h3>Session packs</h3><p>Pay once for 10 or 20 sessions.</p></div>
      <div className="price-grid price-grid-packs">{packs.map(plan => <PriceCard key={plan.id} plan={plan} />)}</div>
    </div> : null}
    <p className="pricing-note">Monthly plans renew automatically. Pack payments are one-off purchases. Your free consultation is included whichever option you choose.</p>
  </>;
}
