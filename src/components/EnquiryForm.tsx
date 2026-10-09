"use client";
import { useState } from "react";
import ReferralField from "./ReferralField";

export default function EnquiryForm({ initialCoaching = '', consultation = false }: { initialCoaching?: string; consultation?: boolean }) {
  const [state,setState]=useState<"idle"|"sending"|"success"|"error">("idle");
  const [error,setError]=useState("");
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(state==="sending") return;
    const form=event.currentTarget; const values=Object.fromEntries(new FormData(form));
    if (consultation) values.message = `Free first appointment request: ${values.message}`;
    setState("sending"); setError("");
    try { const r=await fetch("/api/enquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)}); const data=await r.json(); if(!r.ok) throw new Error(data.error||"Your enquiry could not be sent. Please try again or email Chris."); setState("success"); form.reset(); }
    catch(e) { setState("error");setError(e instanceof Error?e.message:"Please try again or email Chris."); }
  }
  if(state==="success") return <div className="form-success" role="status"><span className="success-icon">✓</span><h3>Thanks for getting in touch.</h3><p>Your enquiry has been received. Chris will be in touch to arrange a time and discuss your goals.</p><button className="text-link" onClick={()=>setState("idle")}>Send another enquiry ↗</button></div>;
  return <form className="enquiry-form" onSubmit={submit}><div className="form-pair"><label>Your name<input autoComplete="name" name="name" required minLength={2} maxLength={100} placeholder="Full name" /></label><label>Email address<input autoComplete="email" name="email" type="email" required maxLength={254} placeholder="you@example.com" /></label></div><label>How would you like to train?<select name="coaching" defaultValue={initialCoaching} required><option value="" disabled>Select an option</option><option value="in_person">In person</option><option value="live_online">Virtual coaching</option><option value="online_programming">Online coaching</option><option value="not_sure">Let’s work it out together</option></select></label><label>What are you working towards?<textarea name="message" required minLength={10} maxLength={1800} rows={4} placeholder="Your goals, training experience and where you’re based…" /></label><ReferralField /><div className="honey" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div><div className="enquiry-permission"><label className="consent"><input type="checkbox" name="consent" value="yes" required /><span>I’m happy for Chris to contact me about this enquiry.</span></label><a className="enquiry-privacy" href="/privacy" target="_blank" rel="noopener noreferrer" aria-label="Privacy policy (opens in a new tab)">Privacy policy <span aria-hidden="true">↗</span></a></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button" disabled={state==="sending"} type="submit">{state==="sending"?"Sending…":consultation ? "Request your free appointment" : "Send your enquiry"}<span aria-hidden="true">↗</span></button></form>;
}
