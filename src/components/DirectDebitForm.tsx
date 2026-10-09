"use client";
import { useRef,useState } from "react";
import ReferralField from "./ReferralField";
export default function DirectDebitForm({planId,amount}:{planId?:string;amount?:string}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const requestId=useRef<string|null>(null);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const referredBy=new FormData(e.currentTarget).get('referredBy')??undefined;setBusy(true);setError("");requestId.current??=crypto.randomUUID();
  try{const r=await fetch('/api/direct-debit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:requestId.current,consent:true,planId,referredBy})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Please try again or contact Chris.');window.location.assign(d.url);}
  catch(e){setError(e instanceof Error?e.message:'Please try again or contact Chris.');setBusy(false);}}
 return (
  <form onSubmit={submit} aria-busy={busy}>
   {planId ? (
    <details className="checkout-referral">
     <summary>Referred by a client? <span>Optional</span></summary>
     <ReferralField />
    </details>
   ) : null}
   <label className="payment-consent">
    <input type="checkbox" required />
    <span>{planId ? `I agree to ${amount}/month by Direct Debit until cancelled.` : 'I have agreed my coaching with Chris and would like to set up a Direct Debit mandate for my coaching payments.'}</span>
   </label>
   {error ? <p className="form-error" role="alert">{error}</p> : null}
   <button className="button" type="submit" disabled={busy}>
    {busy ? 'Opening GoCardless…' : planId ? 'Set up Direct Debit' : 'Continue to GoCardless'}
    <span aria-hidden="true">↗</span>
   </button>
   {planId ? <>
    <p className="checkout-secure"><svg aria-hidden="true" width="13" height="14" viewBox="0 0 16 18" fill="none"><rect x="2" y="7" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7V4a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.4"/></svg> Secure bank details via GoCardless</p>
    <p className="checkout-schedule">Your subscription starts after authorisation. First collection on the earliest available date, then monthly. GoCardless emails your payment dates.</p>
   </> : null}
  </form>
 );
}
