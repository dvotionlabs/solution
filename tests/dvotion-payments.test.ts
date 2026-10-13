import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dvotionPlans,getDvotionPlan} from '../src/lib/dvotion-pricing.ts';
import {getPaymentPlan} from '../src/lib/client-pricing.ts';
import {getPlan,money} from '../src/lib/pricing.ts';
import {billingRequestPayload,subscriptionForBillingRequest} from '../src/lib/gocardless.ts';

test('all DVOTION plans use the agreed 52-week monthly fees and preserve online prices',()=>{
 assert.deepEqual(dvotionPlans.map(p=>[p.id,p.amount,p.perSession]),[
  ['dvotion-performance-1',54167,12500],['dvotion-performance-2',104000,12000],['dvotion-performance-3',149500,11500],
  ['dvotion-movement-1',60667,14000],['dvotion-movement-2',117000,13500],['dvotion-movement-3',162500,12500],
  ['dvotion-training-app',5000,null],['dvotion-endurance-online',15000,null],['dvotion-endurance-performance-online',28500,null],
 ]);
 for(const plan of dvotionPlans){
  assert.equal(plan.amount,plan.sessionsPerWeek?Math.round(plan.perSession!*plan.sessionsPerWeek*52/12):plan.amount);
  assert.equal(getPaymentPlan(plan.id)?.amount,plan.amount);
 }
 assert.equal(money(54167),'£541.67');assert.equal(money(46000),'£460');
 assert.equal(getPlan('in-person-dd4')?.amount,46000,'CG Performance own plans must not change');
 assert.equal(getDvotionPlan('in-person-dd4'),undefined);
});

test('DVOTION mandate provenance and amount are verified before subscription creation',()=>{
 const plan=getDvotionPlan('dvotion-movement-1')!;
 const req=billingRequestPayload(plan,'Forged referral');
 assert.deepEqual(req.metadata,{source:'dvotion-website',plan_id:plan.id,amount:'60667',dvotion_service:'movement-restoration'});
 assert.equal('metadata' in req.mandate_request,false,'CGP referral programme must not leak into DVOTION coaching');
 const billing={id:'BRQ123',status:'fulfilled',metadata:req.metadata,mandate_request:{links:{mandate:'MD123'}}};
 const subscription=subscriptionForBillingRequest(billing)!;
 assert.equal(subscription.amount,60667);assert.equal(subscription.metadata.source,'dvotion-website');
 assert(subscription.name.includes('DVOTION') && subscription.name.includes('Movement Restoration'));
 assert.equal(subscriptionForBillingRequest({...billing,metadata:{...req.metadata,amount:'1'}}),null);
 assert.equal(subscriptionForBillingRequest({...billing,metadata:{...req.metadata,source:'cgp-website'}}),null);
 assert.equal(subscriptionForBillingRequest({...billing,metadata:{...req.metadata,dvotion_service:'online-coaching'}}),null);
 assert.equal(subscriptionForBillingRequest({...billing,status:'pending'}),null);
});
