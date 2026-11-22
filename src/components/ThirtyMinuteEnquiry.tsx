"use client";
import {useState} from "react";

export default function ThirtyMinuteEnquiry(){
  const [state,setState]=useState<"idle"|"sending"|"success"|"error">("idle");
  const [error,setError]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(state==="sending")return;
    const form=e.currentTarget;
    const data=Object.fromEntries(new FormData(form));
    const message=String(data.message||"").trim();
    setState("sending");setError("");
    try{
      const response=await fetch("/api/enquiry",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          name:data.name,email:data.email,coaching:"in_person",
          message:"CG Performance 30-minute PT enquiry (8 sessions / £440 every four weeks).\n\n"+message,
          consent:data.consent,website:data.website||""
        })
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Your enquiry could not be sent.");
      setState("success");form.reset();
    }catch(error){setState("error");setError(error instanceof Error?error.message:"Please try again.");}
  }
  if(state==="success")return <div className="thirty-enquiry thirty-confirmed" role="status"><span className="thirty-check">✓</span><h3>Thanks for getting in touch.</h3><p>We've received your enquiry. We'll be in touch to discuss your training goals and available session times.</p><button className="text-link" type="button" onClick={()=>setState("idle")}>Send another enquiry ↗</button></div>;
  return <form className="thirty-enquiry" onSubmit={submit}>
    <p className="thirty-form-label">START WITH A CONVERSATION</p>
    <div className="thirty-fields">
      <label>Full name <span>*</span><input name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your name"/></label>
      <label>Email address <span>*</span><input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com"/></label>
    </div>
    <label>What are you working towards? <span>*</span><textarea name="message" required minLength={10} maxLength={1700} rows={4} placeholder="Your goals and usual days or times available to train…"/></label>
    <div className="thirty-honey" aria-hidden="true"><label>Website<input name="website" type="text" autoComplete="off" tabIndex={-1}/></label></div>
    <div className="thirty-consent"><label><input name="consent" type="checkbox" required value="yes"/> <span>I'm happy for CG Performance to contact me about my enquiry.</span></label><a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy policy ↗</a></div>
    {state==="error"&&<p role="alert" className="thirty-error">{error} You can also email Chris directly.</p>}
    <button className="button" type="submit" disabled={state==="sending"}>{state==="sending"?"Sending…":"Request your consultation"} <span aria-hidden="true">↗</span></button>
    <p className="thirty-form-foot">No payment is taken here. We'll confirm the training schedule and terms before you start.</p>
  </form>;
}
