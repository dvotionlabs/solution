import { createHmac, timingSafeEqual } from 'node:crypto';
export function validGcSignature(body:string,signature:string|null,secret:string){
 if(!signature||!secret||!/^[a-f0-9]{64}$/i.test(signature))return false;
 return timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',secret).update(body).digest());
}
export async function recordPaymentEvent(event:{provider:'stripe'|'gocardless';id:string;type:string;created:string;payload:unknown;order?:unknown}){
 const key=process.env.PAYMENT_EVENTS_INGEST_KEY,base=process.env.NEXT_PUBLIC_SUPABASE_URL,apiKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!key||!base||!apiKey)throw new Error('Payment event storage is not configured');
 const r=await fetch(`${base}/rest/v1/rpc/cgp_record_payment_event`,{method:'POST',headers:{apikey:apiKey,'Content-Type':'application/json'},body:JSON.stringify({p_key:key,p_provider:event.provider,p_event_id:event.id,p_event_type:event.type,p_created_at:event.created,p_payload:event.payload,p_order:event.order??null}),cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new Error('Payment event could not be stored');
}
