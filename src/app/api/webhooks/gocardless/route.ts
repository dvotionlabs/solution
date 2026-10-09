import { gcConfig, gcRequest, ensureSubscription, type BillingRequest } from '@/lib/gocardless';
import { recordPaymentEvent, validGcSignature } from '@/lib/payment-events';
export const runtime='nodejs';
export const maxDuration=60;
type GcEvent={id:string;resource_type:string;action:string;created_at:string;links?:{billing_request?:string}};
export async function POST(request:Request){
 const secret=process.env.GOCARDLESS_WEBHOOK_SECRET;
 if(!secret||!gcConfig()||!process.env.PAYMENT_EVENTS_INGEST_KEY)return new Response('Not configured',{status:503});
 const raw=await request.text();if(raw.length>1_000_000)return new Response('Payload too large',{status:413});
 if(!validGcSignature(raw,request.headers.get('Webhook-Signature'),secret))return new Response('Invalid signature',{status:498});
 try{
  const body=JSON.parse(raw);if(!Array.isArray(body.events)||body.events.length>100)return new Response('Invalid events',{status:400});
  for(const event of body.events as GcEvent[]){
   if(!event.id||!event.created_at)throw new Error('Invalid event');
   if(event.resource_type==='billing_requests'&&event.action==='fulfilled'&&event.links?.billing_request){
    const {billing_requests}=await gcRequest(`/billing_requests/${encodeURIComponent(event.links.billing_request)}`) as {billing_requests:BillingRequest};
    if(billing_requests.metadata?.source==='cgp-website'&&billing_requests.metadata?.plan_id){
     const subscription=await ensureSubscription(billing_requests);
     if(!subscription)throw new Error('Subscription needs review');
    }
   }
   await recordPaymentEvent({provider:'gocardless',id:event.id,type:`${event.resource_type}.${event.action}`,created:event.created_at,payload:event});
  }
  return new Response(null,{status:204});
 }catch{console.error('GoCardless webhook processing failed');return new Response('Please retry',{status:500});}
}
