import Stripe from 'stripe';
import { recordPaymentEvent } from '@/lib/payment-events';
import { packOrder } from '@/lib/stripe-orders';
export const runtime='nodejs';
// Signature verification is local: no Stripe API key or network calls are needed.
const verifier=new Stripe('webhook-verification-only');
const events=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed']);
export async function POST(request:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret||!process.env.PAYMENT_EVENTS_INGEST_KEY)return new Response('Not configured',{status:503});
 const signature=request.headers.get('stripe-signature');if(!signature)return new Response('Missing signature',{status:400});
 const raw=await request.text();if(raw.length>1_000_000)return new Response('Payload too large',{status:413});
 let event:Stripe.Event;
 try{event=verifier.webhooks.constructEvent(raw,signature,secret);}catch{return new Response('Invalid signature',{status:400});}
 if(!event.livemode||!events.has(event.type))return new Response(null,{status:204});
 const session=event.data.object as Stripe.Checkout.Session;
 if(session.metadata?.source!=='cgp-website')return new Response(null,{status:204});
 const order=packOrder(session,event.type);
 if(!order){console.error('CGP checkout amount or payment link mismatch',event.id);return new Response('Checkout requires review',{status:400});}
 try{await recordPaymentEvent({provider:'stripe',id:event.id,type:event.type,created:new Date(event.created*1000).toISOString(),payload:{session_id:session.id,payment_status:session.payment_status,payment_link:session.payment_link,amount_total:session.amount_total,currency:session.currency},order});return new Response(null,{status:204});}
 catch{console.error('Stripe payment event storage failed',event.id);return new Response('Please retry',{status:500});}
}
