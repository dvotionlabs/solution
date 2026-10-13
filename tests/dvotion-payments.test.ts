import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dvotionPlans,getDvotionPlan} from '../src/lib/dvotion-pricing.ts';
import {getPaymentPlan} from '../src/lib/client-pricing.ts';
import {getPlan,money} from '../src/lib/pricing.ts';
import {billingRequestPayload,subscriptionForBillingRequest} from '../src/lib/gocardless.ts';

const expected=[
 ['dvotion-performance-dd4',4,50000,12500],
 ['dvotion-performance-dd8',8,96000,12000],
 ['dvotion-performance-dd12',12,138000,11500],
 ['dvotion-movement-dd4',4,56000,14000],
 ['dvotion-movement-dd8',8,108000,13500],
 ['dvotion-movement-dd12',12,150000,12500]
] as const;

test('DD4, DD8 and DD12 are exact MONTHLY sessions, not 52-week annual averages',()=>{
 const active=dvotionPlans.filter(p=>p.sessionsPerMonth);
 assert.deepEqual(active.map(p=>[p.id,p.sessionsPerMonth,p.amount,p.perSession]),expected);
 for(const [id,sessions,amount,rate] of expected){
  const p=getDvotionPlan(id)!;
  assert.equal(p.retired,undefined);
  assert.equal(p.sessionsPerWeek,null);
  assert.equal(p.amount,p.sessionsPerMonth!*p.perSession!);
  assert.equal(p.amount,sessions*rate);
  assert.equal(p.amount,amount);
  assert.equal(p.label,`DD${sessions} · ${sessions} sessions per month`);
  assert.equal(getPaymentPlan(id)?.amount,amount);
 }
 assert.equal(money(50000),'£500');assert.equal(money(56000),'£560');
 assert.equal(getPlan('in-person-dd4')?.amount,46000,'CG Performance pricing must not change');
 assert.equal(getDvotionPlan('in-person-dd4'),undefined);
});

test('legacy weekly pricing versions remain immutable for webhook replay only',()=>{
 const old=[['dvotion-performance-1',54167],['dvotion-performance-2',104000],['dvotion-performance-3',149500],['dvotion-movement-1',60667],['dvotion-movement-2',117000],['dvotion-movement-3',162500]] as const;
 for(const [id,amount] of old) {
  const p=getDvotionPlan(id)!;
  assert.equal(p.retired,true);
  assert.equal(p.amount,amount);
  assert.equal(p.sessionsPerMonth,undefined);
  const payload=billingRequestPayload(p);
  const b={id:'BRQ123',status:'fulfilled',metadata:payload.metadata,mandate_request:{links:{mandate:'MD123'}}};
  assert.equal(subscriptionForBillingRequest(b)?.amount,amount,'Existing authorised billing requests must retain their amounts');
 }
 assert.deepEqual(dvotionPlans.filter(p=>p.sessionsPerWeek===null&&!p.sessionsPerMonth).map(p=>[p.id,p.amount]),[
 ['dvotion-training-app',5000],['dvotion-endurance-online',15000],['dvotion-endurance-performance-online',28500]]);
});

test('new monthly mandate source and total are verified against server catalogue',()=>{
 const plan=getDvotionPlan('dvotion-movement-dd4')!;
 const req=billingRequestPayload(plan,'Forged referral');
 assert.deepEqual(req.metadata,{source:'dvotion-website',plan_id:plan.id,amount:'56000',dvotion_service:'movement-restoration'});
 assert.equal('metadata' in req.mandate_request,false);
 const billing={id:'BRQ123',status:'fulfilled',metadata:req.metadata,mandate_request:{links:{mandate:'MD123'}}};
 const subscription=subscriptionForBillingRequest(billing)!;
 assert.equal(subscription.amount,56000);
 assert.equal(subscription.metadata.source,'dvotion-website');
 assert(subscription.name.includes('DVOTION')&&subscription.name.includes('Movement Restoration'));
 assert.equal(subscriptionForBillingRequest({...billing,metadata:{...req.metadata,amount:'60667'}}),null);
 assert.equal(subscriptionForBillingRequest({...billing,metadata:{...req.metadata,source:'cgp-website'}}),null);
 assert.equal(subscriptionForBillingRequest({...billing,metadata:{...req.metadata,dvotion_service:'online-coaching'}}),null);
 assert.equal(subscriptionForBillingRequest({...billing,status:'pending'}),null);
});
