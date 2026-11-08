import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizedClientPlan, clientPlanQuote, getPaymentPlan, resolveClientCode } from '../src/lib/client-pricing.ts';
import { billingRequestPayload, subscriptionForBillingRequest } from '../src/lib/gocardless.ts';
import { packOrder } from '../src/lib/stripe-orders.ts';

// Synthetic identities only. Real client codes and rates stay in server configuration.
const fixture = [
  { id: 'client-test-a', code: 'TESTA', basePlanId: 'in-person-dd8', amount: 70400 },
  { id: 'client-test-b', code: 'TESTB', basePlanId: 'in-person-dd4', amount: 38000 },
  { id: 'client-test-pack', code: 'TESTPACK', basePlanId: 'in-person-pack10', amount: 100000, paymentUrl: 'https://buy.stripe.com/testpack', paymentLinkId: 'plink_testpack' },
];

test('client prices are restricted to the matching code and the December start date', () => {
  const old = process.env.CGP_CLIENT_PLANS;
  process.env.CGP_CLIENT_PLANS = JSON.stringify(fixture);
  try {
    const before = Date.parse('2026-11-30T23:59:59Z'), after = Date.parse('2026-12-01T00:00:00Z');
    assert.equal(resolveClientCode(' testa ')?.perSession, 8800);
    assert.equal(resolveClientCode('__proto__'), undefined);
    assert.equal(resolveClientCode({ code: 'TESTA' }), undefined);
    assert.equal(authorizedClientPlan('client-test-a', 'TESTA', before), undefined);
    assert.equal(authorizedClientPlan('client-test-a', 'TESTB', after), undefined);
    assert.equal(authorizedClientPlan('in-person-dd12', 'TESTA', after), undefined);
    assert.equal(authorizedClientPlan('client-test-a', undefined, after), undefined);
    assert.equal(authorizedClientPlan('client-test-a', 'TESTA', after)?.amount, 70400);
    assert.equal(clientPlanQuote('TESTPACK', before)?.paymentUrl, undefined);
    assert.equal(clientPlanQuote('TESTPACK', before)?.active, false);
    assert.equal(clientPlanQuote('TESTPACK', after)?.paymentUrl, 'https://buy.stripe.com/testpack');
    assert.equal(clientPlanQuote('TESTB', after)?.amount, 38000);
    assert.equal(clientPlanQuote('TESTA', after)?.kind, 'monthly');
  } finally { if (old === undefined) delete process.env.CGP_CLIENT_PLANS; else process.env.CGP_CLIENT_PLANS = old; }
});

test('two existing clients can set up their agreed DD8 rates now without activating December plans', () => {
  const prior = process.env.CGP_CLIENT_PLANS;
  const priorOverrides = process.env.CGP_CLIENT_PLAN_OVERRIDES;
  process.env.CGP_CLIENT_PLANS = JSON.stringify([
    { id: 'client-202612-01', code: 'IRISF', basePlanId: 'in-person-dd8', amount: 70400 },
    { id: 'client-202612-02', code: 'ALEXC', basePlanId: 'in-person-dd8', amount: 76000 },
    { id: 'client-202612-other', code: 'OTHER', basePlanId: 'in-person-dd8', amount: 80000 },
  ]);
  process.env.CGP_CLIENT_PLAN_OVERRIDES = JSON.stringify([
    { id: 'client-202611-irisf', code: 'IRISF', basePlanId: 'in-person-dd8', amount: 70000, availableFrom: '2026-11-08T00:00:00Z' },
    { id: 'client-202611-alexc', code: 'ALEXC', basePlanId: 'in-person-dd8', amount: 76000, availableFrom: '2026-11-08T00:00:00Z' },
  ]);
  try {
    const today = Date.parse('2026-11-08T17:00:00Z');
    assert.equal(clientPlanQuote('IRISF', today)?.perSession, 8750);
    assert.equal(clientPlanQuote('IRISF', today)?.amount, 70000);
    assert.equal(clientPlanQuote('ALEXC', today)?.amount, 76000);
    assert.equal(clientPlanQuote('IRISF', today)?.active, true);
    assert.equal(clientPlanQuote('ALEXC', today)?.active, true);
    assert.equal(authorizedClientPlan('client-202611-irisf', 'IRISF', today)?.amount, 70000);
    assert.equal(authorizedClientPlan('client-202611-alexc', 'ALEXC', today)?.amount, 76000);
    assert.equal(authorizedClientPlan('client-202611-alexc', 'IRISF', today), undefined);
    assert.equal(clientPlanQuote('OTHER', today)?.active, false);
    assert.equal(getPaymentPlan('client-202612-01')?.amount, 70400); // old webhook IDs remain immutable
    assert.equal(getPaymentPlan('client-202611-irisf')?.amount, 70000);
    assert.equal(authorizedClientPlan('client-202611-irisf', 'IRISF', Date.parse('2026-11-07T23:59:59Z')), undefined);
  } finally {
    if (prior === undefined) delete process.env.CGP_CLIENT_PLANS; else process.env.CGP_CLIENT_PLANS = prior;
    if (priorOverrides === undefined) delete process.env.CGP_CLIENT_PLAN_OVERRIDES; else process.env.CGP_CLIENT_PLAN_OVERRIDES = priorOverrides;
  }
});

test('fulfilment preserves an agreed client rate and rejects altered totals or payment links', () => {
  const old = process.env.CGP_CLIENT_PLANS;
  process.env.CGP_CLIENT_PLANS = JSON.stringify(fixture);
  try {
    const plan = resolveClientCode('TESTA')!;
    const payload = billingRequestPayload(plan);
    assert.equal(Object.keys(payload.metadata).length, 3);
    const billing = { id: 'BRQ123', status: 'fulfilled', ...payload, mandate_request: { links: { mandate: 'MD123' } } };
    const subscription = subscriptionForBillingRequest(billing)!;
    assert.equal(subscription.amount, 70400);
    assert.equal(subscription.interval_unit, 'monthly');
    assert.equal(subscription.interval, 1);
    assert.equal(subscriptionForBillingRequest({ ...billing, metadata: { ...payload.metadata, amount: '1' } }), null);
    assert.equal(subscriptionForBillingRequest({ ...billing, metadata: { ...payload.metadata, plan_id: 'client-test-b' } }), null);
    const pack = { id: 'cs_test', metadata: { source: 'cgp-website', plan_id: 'client-test-pack' }, payment_link: 'plink_testpack', amount_total: 100000, currency: 'gbp', payment_status: 'paid' };
    assert.equal(packOrder(pack, 'checkout.session.completed')?.amount, 100000);
    assert.equal(packOrder({ ...pack, id: 'cs_repeat' }, 'checkout.session.completed')?.status, 'paid');
    assert.equal(packOrder({ ...pack, amount_total: 1 }, 'checkout.session.completed'), null);
    assert.equal(packOrder({ ...pack, payment_link: 'plink_other' }, 'checkout.session.completed'), null);
    assert.equal(packOrder({ ...pack, payment_status: 'unpaid' }, 'checkout.session.completed')?.status, 'pending');
  } finally { if (old === undefined) delete process.env.CGP_CLIENT_PLANS; else process.env.CGP_CLIENT_PLANS = old; }
});

test('missing or malformed private pricing fails closed', () => {
  const old = process.env.CGP_CLIENT_PLANS;
  try {
    for (const config of ['', '{', '{}', JSON.stringify([{ ...fixture[0], amount: -1 }]), JSON.stringify([fixture[0], fixture[0]]), JSON.stringify([{ ...fixture[2], paymentUrl: 'https://example.com/unsafe' }])]) {
      process.env.CGP_CLIENT_PLANS = config;
      assert.equal(resolveClientCode('TESTA'), undefined);
      assert.equal(resolveClientCode('TESTPACK'), undefined);
    }
  } finally { if (old === undefined) delete process.env.CGP_CLIENT_PLANS; else process.env.CGP_CLIENT_PLANS = old; }
});
