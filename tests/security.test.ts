import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signBillingSession,verifyBillingSession} from '../src/lib/gocardless.ts';
import {validateEnquiry,sameOrigin} from '../src/lib/validation.ts';
test('payment callback rejects forged, malformed and foreign-key cookies',()=>{const s=signBillingSession('BRQ123456','test-only');assert.equal(verifyBillingSession(s,'test-only'),'BRQ123456');assert.equal(verifyBillingSession(s,'different'),null);assert.equal(verifyBillingSession(s.replace('123456','654321'),'test-only'),null);assert.equal(verifyBillingSession('BRQ123456.a','test-only'),null);assert.equal(verifyBillingSession(undefined,'test-only'),null);});
test('enquiries require consent and valid bounded fields',()=>{const valid={name:'Test Person',email:'TEST@example.com',coaching:'in_person',message:'I would like to discuss strength coaching.',consent:'yes'};assert.equal(validateEnquiry(valid)?.email,'test@example.com');assert.equal(validateEnquiry({...valid,consent:'no'}),null);assert.equal(validateEnquiry({...valid,coaching:'other'}),null);assert.equal(validateEnquiry({...valid,message:'a'.repeat(2001)}),null);assert.equal(validateEnquiry({...valid,email:'invalid'}),null);});
test('cross-origin submission is rejected',()=>{assert.equal(sameOrigin(new Request('https://cgp.example/api/enquiry',{headers:{origin:'https://attacker.example'}})),false);assert.equal(sameOrigin(new Request('https://cgp.example/api/enquiry',{headers:{origin:'https://cgp.example'}})),true);});

import {createHmac} from 'node:crypto';
import {plans,getPlan} from '../src/lib/pricing.ts';
import {subscriptionForBillingRequest,ensureSubscription} from '../src/lib/gocardless.ts';
import {validGcSignature} from '../src/lib/payment-events.ts';
import {packOrder} from '../src/lib/stripe-orders.ts';
test('all quoted totals are fixed in GBP pence and pack/monthly plans stay distinct',()=>{
 assert.deepEqual(plans.map(p=>[p.id,p.amount]),[['in-person-dd4',46000],['in-person-dd8',88000],['in-person-dd12',126000],['in-person-pack10',115000],['in-person-pack20',220000],['virtual-dd4',42000],['virtual-dd8',80000],['virtual-dd12',114000],['virtual-pack10',105000],['virtual-pack20',200000],['online-monthly',16500]]);
 for(const p of plans)if(p.sessions&&p.perSession)assert.equal(p.amount,p.sessions*p.perSession);
 assert.equal(getPlan('__proto__'),undefined);assert.equal(getPlan({id:'online-monthly'}),undefined);
});
test('subscriptions require a fulfilled mandate and the exact agreed monthly plan',()=>{
 const b={id:'BRQ123',status:'fulfilled',metadata:{source:'cgp-website',plan_id:'in-person-dd4',amount:'46000'},mandate_request:{links:{mandate:'MD123'}}};
 assert.equal(subscriptionForBillingRequest(b)?.amount,46000);
 assert.equal(subscriptionForBillingRequest({...b,status:'pending'}),null);
 assert.equal(subscriptionForBillingRequest({...b,metadata:{...b.metadata,amount:'1'}}),null);
 assert.equal(subscriptionForBillingRequest({...b,metadata:{...b.metadata,plan_id:'in-person-pack10',amount:'115000'}}),null);
 assert.equal(subscriptionForBillingRequest({...b,metadata:{source:'legacy'}}),null);
});
test('GoCardless signatures reject tampering and malformed digests',()=>{
 const raw='{"events":[]}',secret='test-secret';const sig=createHmac('sha256',secret).update(raw).digest('hex');
 assert.equal(validGcSignature(raw,sig,secret),true);assert.equal(validGcSignature(raw+' ',sig,secret),false);assert.equal(validGcSignature(raw,'invalid',secret),false);assert.equal(validGcSignature(raw,sig,''),false);
});
test('checkout completed does not mark an asynchronous pack payment paid',()=>{
 const s={id:'cs_test',metadata:{source:'cgp-website',plan_id:'virtual-pack10'},payment_link:getPlan('virtual-pack10')!.paymentLinkId,amount_total:105000,currency:'gbp',payment_status:'unpaid'};
 assert.equal(packOrder(s,'checkout.session.completed')?.status,'pending');
 assert.equal(packOrder({...s,payment_status:'paid'},'checkout.session.async_payment_succeeded')?.status,'paid');
 assert.equal(packOrder(s,'checkout.session.async_payment_failed')?.status,'failed');
 assert.equal(packOrder({...s,amount_total:1},'checkout.session.completed'),null);
 assert.equal(packOrder({...s,payment_link:'foreign'},'checkout.session.completed'),null);
});
test('replayed fulfilment reuses the subscription, including after cancellation',async()=>{
 const original=globalThis.fetch,oldToken=process.env.GOCARDLESS_ACCESS_TOKEN,oldEnvironment=process.env.GOCARDLESS_ENVIRONMENT;
 process.env.GOCARDLESS_ACCESS_TOKEN='test-only';process.env.GOCARDLESS_ENVIRONMENT='sandbox';
 let posts=0;
 globalThis.fetch=async (_input,init)=>{if(init?.method==='POST')posts++;return Response.json({subscriptions:[{id:'SB123',status:'cancelled',metadata:{billing_request:'BRQ123'}}]});};
 try{const result=await ensureSubscription({id:'BRQ123',status:'fulfilled',metadata:{source:'cgp-website',plan_id:'online-monthly',amount:'16500'},mandate_request:{links:{mandate:'MD123'}}});assert.equal(result.id,'SB123');assert.equal(posts,0);}
 finally{globalThis.fetch=original;if(oldToken===undefined)delete process.env.GOCARDLESS_ACCESS_TOKEN;else process.env.GOCARDLESS_ACCESS_TOKEN=oldToken;if(oldEnvironment===undefined)delete process.env.GOCARDLESS_ENVIRONMENT;else process.env.GOCARDLESS_ENVIRONMENT=oldEnvironment;}
});
