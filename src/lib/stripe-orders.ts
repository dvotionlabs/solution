import { getPlan } from './pricing.ts';
export type CheckoutData={id:string;metadata?:Record<string,string>|null;payment_link?:string|{id:string}|null;amount_total?:number|null;currency?:string|null;payment_status:string;payment_intent?:string|{id:string}|null;customer_details?:{email?:string|null;name?:string|null}|null};
export function packOrder(session:CheckoutData,eventType:string){
 const plan=getPlan(session.metadata?.plan_id);
 const link=typeof session.payment_link==='string'?session.payment_link:session.payment_link?.id;
 if(session.metadata?.source!=='cgp-website'||!plan||plan.kind!=='pack'||link!==plan.paymentLinkId||session.amount_total!==plan.amount||session.currency!=='gbp')return null;
 return {session_id:session.id,plan_id:plan.id,amount:plan.amount,currency:'gbp',email:session.customer_details?.email??null,name:session.customer_details?.name??null,status:session.payment_status==='paid'?'paid':eventType==='checkout.session.async_payment_failed'?'failed':'pending',payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id??null};
}
