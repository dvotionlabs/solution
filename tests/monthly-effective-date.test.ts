import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Admin clearly shows that future monthly plans do not create current-month credits',()=>{
 const ui=readFileSync(new URL('../src/components/portal/MonthlyPlanControl.tsx',import.meta.url),'utf8');
 assert.ok(ui.includes('plan.start_month>londonDay()'));
 assert.ok(ui.includes("'Monthly renewals start on '"));
 assert.ok(ui.includes('Monthly allowance active from'));
 assert.ok(ui.includes('Manual only'));
 assert.ok(ui.includes('4 sessions / month'));
 assert.ok(ui.includes('8 sessions / month'));
});
