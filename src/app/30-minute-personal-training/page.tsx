import type { Metadata } from "next";
import Image from "next/image";
import ThirtyMinuteEnquiry from "@/components/ThirtyMinuteEnquiry";
import "./thirty-minute.css";

export const metadata: Metadata = {
  title: "30-Minute Personal Training in London",
  description: "Individualised 30-minute personal training with CG Performance in Liverpool Street, London. Two coached sessions each week, £440 every four weeks.",
  robots: { index: false, follow: false },
};

const faqs = [
  { question: "Can I really make progress in 30 minutes?", answer: "Yes. The focus is on choosing the right work, coaching it well and progressing it across your week. It is not a shortened version of an hour-long workout or a race through as many exercises as possible." },
  { question: "What happens in each session?", answer: "We start with preparation suited to how you move and what you are training that day. The main work typically involves three to five carefully selected exercises, with working sets and load adapted to your goals and current phase." },
  { question: "How often will I train?", answer: "The plan includes two 30-minute one-to-one sessions each week, or eight sessions over each four-week billing period. We agree your usual training times before you start." },
  { question: "Is there an initial consultation?", answer: "Yes. Your first appointment is a consultation to understand your goals, experience and movement capabilities before we build your programme." },
  { question: "How does payment work?", answer: "The plan is £440 every four weeks (£55 per session for eight sessions), paid by recurring Direct Debit once your training times are agreed. Full rescheduling and cancellation terms will be shared before you authorise payment." },
];

export default function ThirtyMinuteTrainingPage() {
  return (
    <div className="thirty-page">
      <section className="thirty-hero wrap" aria-labelledby="thirty-title">
        <div className="thirty-hero-copy">
          <p className="eyebrow"><span className="status-dot" /> CG PERFORMANCE / LIVERPOOL STREET</p>
          <h1 id="thirty-title">30 minutes.<br /><span className="thirty-outline">Made to count.</span></h1>
          <p className="thirty-lead">Individual coaching for people who want strength, movement and meaningful progress — without needing an hour in the gym.</p>
          <div className="thirty-hero-actions">
            <a className="button" href="#thirty-start">Get started <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#thirty-method">How it works <span aria-hidden="true">↓</span></a>
          </div>
          <div className="thirty-hero-facts"><span>1-TO-1 COACHING</span><span>2 SESSIONS / WEEK</span><span>30 MINUTES / SESSION</span></div>
        </div>
        <div className="thirty-hero-photo">
          <Image src="/force-plate-squat.webp" alt="One-to-one strength and movement coaching with CG Performance" fill priority sizes="(max-width: 850px) 100vw, 45vw" />
          <span>STRENGTH / MOVEMENT / PROGRESSION</span>
        </div>
      </section>

      <section id="thirty-method" className="thirty-method wrap">
        <div className="section-label"><span>01 / THE METHOD</span><span>A CLEAR PURPOSE, EVERY SESSION</span></div>
        <div className="thirty-intro">
          <h2>Shorter sessions.<br /><span className="muted">The same attention to detail.</span></h2>
          <div><p className="thirty-big">Your programme starts with understanding how you move and what you want to achieve.</p><p>Every session begins with movement preparation, followed by a focused selection of strength exercises. Your trainer monitors how you perform each repetition and adapts the work as you progress.</p></div>
        </div>
        <div className="thirty-steps">
          <article><span>01</span><h3>Understand</h3><p>We start with a consultation covering your goals, training history and movement capabilities.</p></article>
          <article><span>02</span><h3>Prepare</h3><p>Movement preparation is individualised to your needs and what the session requires.</p></article>
          <article><span>03</span><h3>Train &amp; progress</h3><p>Typically three to five exercises with focused working sets, progressive loading and coaching throughout.</p></article>
        </div>
      </section>

      <section className="thirty-value">
        <div className="wrap thirty-value-grid">
          <div><div className="section-label"><span>02 / WHY IT WORKS</span></div><h2>Every rep<br />has a reason.</h2></div>
          <div><p className="thirty-big">Training quality should not depend on how long you spend in the gym.</p><p>Our coaching prioritises appropriate exercise selection, effort and progression. We don't chase more weight at the expense of the movement options we're working to develop.</p><p>It's a focused format for busy professionals, people returning to consistent training and active people who want strength work alongside sport or everyday life.</p></div>
        </div>
      </section>

      <section className="thirty-pricing wrap" id="thirty-plan">
        <div className="section-label"><span>03 / YOUR PLAN</span><span>ONE STRAIGHTFORWARD OPTION</span></div>
        <div className="thirty-plan-grid"><div className="thirty-plan-intro"><h2>Consistency.<br /><span className="muted">Without the extra hours.</span></h2><p>One plan, two dedicated training slots each week and a programme built for you.</p></div>
          <div className="thirty-plan-card"><span className="thirty-plan-kicker">30-MINUTE PERSONAL TRAINING</span><h3>Two sessions per week.</h3><div className="thirty-price">£55<span> / session</span></div><div className="thirty-fourweek">£440 every four weeks · Direct Debit</div><ul><li>Eight individually coached sessions per four weeks</li><li>Individualised training programme</li><li>Movement preparation and progressive strength work</li><li>Reserved weekly training times</li><li>Initial consultation before training begins</li></ul><a className="button" href="#thirty-start">Enquire about training <span aria-hidden="true">↗</span></a><p className="thirty-terms">The four-week billing cycle is different from a calendar month. No payment is taken on this page. Payment and full rescheduling/cancellation terms are agreed before you sign up.</p></div>
        </div>
      </section>

      <section className="thirty-faq"><div className="wrap"><div className="section-label"><span>04 / QUESTIONS</span><span>BEFORE YOU START</span></div><h2>The essentials.</h2><div className="thirty-faq-list">{faqs.map((faq,index)=><details key={faq.question}><summary><span>0{index+1}</span>{faq.question}<b aria-hidden="true">+</b></summary><p>{faq.answer}</p></details>)}</div></div></section>

      <section id="thirty-start" className="thirty-contact"><div className="wrap thirty-contact-grid"><div><p className="eyebrow">05 / GET STARTED</p><h2>Make room<br />for progress.</h2><p>Tell us what you want to work towards and when you're available. We'll get in touch to discuss the consultation and suitable training slots.</p><a href="mailto:chrisgkoufas.performance@gmail.com" className="text-link">chrisgkoufas.performance@gmail.com <span aria-hidden="true">↗</span></a></div><ThirtyMinuteEnquiry /></div></section>
    </div>
  );
}
