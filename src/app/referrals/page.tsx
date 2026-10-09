import type { Metadata } from 'next';
import EnquiryForm from '@/components/EnquiryForm';
import PlanPicker from '@/components/PlanPicker';

export const metadata: Metadata = {
  title: 'Refer a friend',
  description: 'Refer someone to CG Performance. When they join a monthly Direct Debit plan, you receive 50% off one month of training. Their first appointment is free.',
};

export default function ReferralsPage() {
  return <>
    <section className="wrap section-space referral-intro">
      <a className="back-link" href="/">← Back to CG Performance</a>
      <p className="eyebrow">A THANK YOU FOR THE INTRODUCTION</p>
      <h1>Refer a friend.<br /><span className="outline-word">Get 50% off a month.</span></h1>
      <p className="lead">Already training with me? If someone you refer joins a monthly Direct Debit plan, you’ll receive 50% off one month of training.</p>
      <div className="purchase-actions"><a className="button" href="#plans">Choose a Direct Debit or pack <span aria-hidden="true">↓</span></a><a className="text-link" href="#appointment">Free consultation <span aria-hidden="true">↗</span></a></div>
      <div className="principles">
        <div><span>01</span><h3>Make the introduction.</h3><p>Share this page with someone who could benefit from coaching. Ask them to include your name when they sign up or request a consultation.</p></div>
        <div><span>02</span><h3>They choose how to start.</h3><p>They can join a plan straight away or arrange a free consultation first to discuss their goals and how I can help.</p></div>
        <div><span>03</span><h3>They join. You save 50%.</h3><p>Once they sign up for a monthly Direct Debit plan, I’ll confirm your referral and arrange 50% off one month of your training.</p></div>
      </div>
      <p className="pricing-note">Your 50% discount applies to one month of your current coaching plan. The reward applies when a new client you refer joins a monthly Direct Debit plan. A free appointment or a session pack purchase on its own does not qualify.</p>
    </section>
    <section id="plans" className="wrap referral-plans section-space" aria-labelledby="plans-heading"><p className="eyebrow">READY TO GET STARTED?</p><h2 id="plans-heading">Choose your coaching.</h2><p className="plans-intro">Select how you’d like to train, then choose a monthly Direct Debit plan or a session pack. You can sign up now and we’ll arrange your free consultation afterwards.</p><PlanPicker /></section>
    <section id="appointment" className="contact-section">
      <div className="wrap contact-grid section-space">
        <div><p className="eyebrow">NEW TO CG PERFORMANCE?</p><h2>Your first<br />appointment is free.</h2><p>We’ll talk through your goals, past training experiences, current lifestyle and any limitations. It’s a chance to understand where you are now and how I can help you get where you want to be.</p><p>Leave your details and the name of the client who referred you. I’ll be in touch to arrange a time.</p><a className="contact-email" href="mailto:chrisgkoufas.performance@gmail.com">chrisgkoufas.performance@gmail.com ↗</a></div>
        <EnquiryForm consultation />
      </div>
    </section>
  </>;
}
