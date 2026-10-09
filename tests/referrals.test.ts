import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnquiry } from '../src/lib/validation.ts';
import { getPlan } from '../src/lib/pricing.ts';
import { billingRequestPayload, billingReferral, subscriptionForBillingRequest } from '../src/lib/gocardless.ts';

test('referral enquiries retain attribution within existing storage limits', () => {
  const input = {name:'New Client',email:'new@example.com',coaching:'in_person',message:'Free first appointment request: I would like to discuss my training.',consent:'yes'};
  assert.equal(validateEnquiry(input)?.message,input.message);
  assert.equal(validateEnquiry({...input,referredBy:'  Current   Client  '})?.message,`Referred by: Current Client\n\n${input.message}`);
  assert.equal(validateEnquiry({...input,referredBy:'a'.repeat(101)}),null);
  assert.equal(validateEnquiry({...input,referredBy:{name:'Client'}}),null);
  assert.equal(validateEnquiry({...input,referredBy:'Client\nAnother attribution'}),null);
  assert.equal(validateEnquiry({...input,referredBy:'Client',message:'x'.repeat(2000)}),null);
  assert.ok(validateEnquiry({...input,referredBy:'x'.repeat(100),message:'Free first appointment request: '+'x'.repeat(1800)}));
});

test('referral capture preserves the full agreed price and provider metadata limits', () => {
  const plan=getPlan('in-person-dd8')!;
  const request=billingRequestPayload(plan,'Current Client');
  assert.deepEqual(request.metadata,{source:'cgp-website',plan_id:'in-person-dd8',amount:'88000'});
  assert.equal(request.mandate_request.metadata?.referred_by,'Current Client');
  assert.equal(Object.keys(request.metadata).length,3);
  assert.equal(billingRequestPayload().mandate_request.metadata,undefined);
  const billing={id:'BRQ123',status:'fulfilled',...request,mandate_request:{...request.mandate_request,links:{mandate:'MD123'}}};
  assert.equal(subscriptionForBillingRequest(billing)?.amount,88000);
  assert.deepEqual(billingReferral(billing,'SB123'),{referred_by:'Current Client',billing_request_id:'BRQ123',subscription_id:'SB123',plan_id:'in-person-dd8',reward_percent:50,reward_months:1,status:'needs_review'});
});

test('a referral name alone never qualifies an incomplete or incorrect monthly setup', () => {
  const billing={id:'BRQ123',status:'fulfilled',metadata:{source:'cgp-website',plan_id:'online-monthly',amount:'16500'},mandate_request:{metadata:{referred_by:'Current Client'},links:{mandate:'MD123'}}};
  assert.equal(billingReferral({...billing,status:'pending'},'SB123'),null);
  assert.equal(billingReferral({...billing,metadata:{...billing.metadata,amount:'1'}},'SB123'),null);
  assert.equal(billingReferral({...billing,metadata:{...billing.metadata,plan_id:'virtual-pack10',amount:'105000'}},'SB123'),null);
  assert.equal(billingReferral({...billing,mandate_request:{links:{mandate:'MD123'}}},'SB123'),null);
  assert.equal(billingReferral(billing,'invalid'),null);
  assert.equal(billingReferral(billing,'SB123')?.reward_percent,50);
});
