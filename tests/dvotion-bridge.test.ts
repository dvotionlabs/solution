import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dvotionBridgeAuthorised } from '../src/lib/dvotion-bridge.ts';
import { readFileSync } from 'node:fs';

test('DVOTION bridge checks secret server-side and fails closed', () => {
  const previous = process.env.DVOTION_CGP_BRIDGE_SECRET;
  process.env.DVOTION_CGP_BRIDGE_SECRET = 'test-bridge-secret-with-at-least-thirty-two-chars';
  try {
    const request = (secret: string) => new Request('https://cgp-dvotion.vercel.app/api/direct-debit',
      { headers: { 'x-dvotion-bridge-secret': secret } });
    assert.equal(dvotionBridgeAuthorised(request('bad')), false);
    assert.equal(dvotionBridgeAuthorised(request('test-bridge-secret-with-at-least-thirty-two-char')), false);
    assert.equal(dvotionBridgeAuthorised(request('test-bridge-secret-with-at-least-thirty-two-chars')), true);
  } finally {
    if (previous === undefined) delete process.env.DVOTION_CGP_BRIDGE_SECRET;
    else process.env.DVOTION_CGP_BRIDGE_SECRET = previous;
  }
});

test('bridge accepts only active DVOTION plans, keeps legacy CGP checkout', () => {
  const src = readFileSync(new URL('../src/app/api/direct-debit/route.ts', import.meta.url), 'utf8');
  assert.match(src, /!dvotion\|\|dvotion\.retired/);
  assert.match(src, /body\.flowMode!=='dropin'/);
  assert.match(src, /bridge\?\{flowId,environment:/);
  assert.match(src, /https:\/\/dvotionlabs\.com\/coaching\/complete/);
});
