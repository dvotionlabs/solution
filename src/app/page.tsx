import Image from "next/image";
import EnquiryForm from "@/components/EnquiryForm";

export default function Home() {
  return <>
    <section className="hero wrap" aria-labelledby="hero-title">
      <div className="hero-intro"><p className="eyebrow"><span className="status-dot" /> INDIVIDUAL COACHING. LONG-TERM PROGRESS.</p><div className="hero-heading"><h1 id="hero-title">Move better.<br />Build <span className="outline-word">strength.</span></h1><div className="hero-summary"><p>Build muscle, change your physique and develop strength, with coaching that pays close attention to how you move.</p><a className="text-link" href="#contact">Start a conversation <span aria-hidden="true">↗</span></a></div></div></div>
      <div className="hero-image"><Image src="/force-plate-squat.webp" alt="An athlete completing a jump assessment with coaches at DVOTION" fill priority sizes="(max-width: 800px) 100vw, 94vw" /><div className="image-caption"><span>CHRIS GKOUFAS<br />STRENGTH & MOVEMENT COACH</span><span className="caption-right">LONDON / ST ALBANS / ONLINE</span></div></div>
      <div className="hero-foot"><span>One coach. A plan that evolves with you.</span><a href="#approach">Explore the approach <span aria-hidden="true">↓</span></a></div>
    </section>
    <section id="approach" className="approach wrap section-space">
      <div className="section-label"><span>01 / THE APPROACH</span><span>PHYSIQUE. STRENGTH. MOVEMENT.</span></div>
      <div className="approach-grid">
        <h2>Build the body<br />you want.<br /><span className="muted">Keep it<br />moving well.</span></h2>
        <div className="approach-copy">
          <p className="lead">You might want to build muscle, change your shape or feel stronger. We start with what matters to you.</p>
          <p>My coaching brings those goals together with how your body moves. The positions you can access, how you lift and how you respond to training all inform the exercises, loading and progression.</p>
          <p>I track changes in your physique and strength alongside how comfortably you move. The aim is to develop your body while maintaining and expanding your movement options.</p>
          <p>Your programme may include breathing drills, foam rolling or targeted preparation. I’ll explain what each is intended to do and how it fits into your training.</p>
          <a className="text-link" href="#coaching">Find your coaching option <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div className="principles">
        <div><span>01</span><h3>Your goals set the direction.</h3><p>Build muscle, change your physique or develop strength. We agree what success looks like for you.</p></div>
        <div><span>02</span><h3>Movement guides the work.</h3><p>I choose positions and exercises with your current movement options in mind, then work to develop strength and control.</p></div>
        <div><span>03</span><h3>Progress shapes the plan.</h3><p>We review your results, recovery and how you feel in training. Loading, exercise selection and preparation evolve with you.</p></div>
      </div>
    </section>
    <section id="coaching" className="coaching-section"><div className="wrap section-space"><div className="section-label"><span>02 / WORK WITH ME</span><span>YOUR TRAINING. YOUR SETTING.</span></div><div className="section-heading"><h2>Coaching that<br />fits your life.</h2><p>The same care and individual attention,<br />wherever you train.</p></div><div className="coaching-list">
      <a className="coaching-row" href="/coaching/in-person"><span className="row-number">01</span><div><h3>In person</h3><p>One-to-one strength and movement coaching. Train with me in London or St Albans, with the location and schedule agreed together.</p></div><span className="row-tag">VIEW PRICING</span><span className="row-arrow" aria-hidden="true">↗</span></a>
      <a className="coaching-row" href="/coaching/virtual"><span className="row-number">02</span><div><h3>Virtual coaching</h3><p>Real-time coaching by video, with guidance and feedback throughout your session. Train from your own gym or home.</p></div><span className="row-tag">VIEW PRICING</span><span className="row-arrow" aria-hidden="true">↗</span></a>
      <a className="coaching-row" href="/coaching/online"><span className="row-number">03</span><div><h3>Online coaching</h3><p>An individual programme to follow in your own time, with regular reviews and adjustments to keep your training moving forward.</p></div><span className="row-tag">VIEW PRICING</span><span className="row-arrow" aria-hidden="true">↗</span></a>
    </div></div></section>
    <section id="chris" className="coach wrap section-space"><div className="coach-image"><Image src="/movement-arm.webp" alt="Chris Gkoufas assessing an athlete’s shoulder movement" fill sizes="(max-width: 760px) 100vw, 48vw" /></div><div className="coach-copy"><p className="eyebrow">03 / YOUR COACH</p><h2>Chris Gkoufas.</h2><p className="coach-role">FOUNDER OF CG PERFORMANCE & DVOTION</p><p className="lead">A considered approach to getting more from your body.</p><p>My work brings together biomechanics, strength and conditioning, and experience coaching professional and recreational athletes.</p><p>Whether you want to change your physique, get stronger or work towards an event, I’ll help you build a plan that considers both your goals and how your body responds.</p><div className="credentials"><span>BSc (Hons) Sport & Exercise Science</span><span>Strength & Conditioning Level 4</span></div><a className="text-link" href="#contact">Tell me what you’re working towards <span aria-hidden="true">↗</span></a></div></section>
    <section id="contact" className="contact-section"><div className="wrap contact-grid section-space"><div><p className="eyebrow">04 / LET’S GET STARTED</p><h2>What do you want<br />to be able to do?</h2><p>Your initial consultation and assessment are free. Tell me about your goals and how you’d like to train, and I’ll get in touch to arrange a time.</p><a className="contact-email" href="mailto:chrisgkoufas.performance@gmail.com">chrisgkoufas.performance@gmail.com ↗</a><p className="contact-note">Already training with me? <a href="/direct-debit">Set up your Direct Debit.</a></p></div><EnquiryForm consultation /></div></section>
  </>;
}
