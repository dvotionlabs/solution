"use client";
import { useRef,useState } from "react";
export default function DirectDebitForm(){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const requestId=useRef<string|null>(null);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;setBusy(true);setError("");requestId.current??=crypto.randomUUID();
  try{const r=await fetch('/api/direct-debit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:requestId.current,consent:true})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Please try again or contact Chris.');window.location.assign(d.url);}
  catch(e){setError(e instanceof Error?e.message:'Please try again or contact Chris.');setBusy(false);}}
 return <form onSubmit={submit}><label className="payment-consent"><input type="checkbox" required/><span>I have agreed my coaching with Chris and would like to set up a Direct Debit mandate for my coaching payments.</span></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button" type="submit" disabled={busy}>{busy?'Opening GoCardless…':'Continue to GoCardless'}<span aria-hidden="true">↗</span></button></form>;
}
