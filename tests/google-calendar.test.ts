import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingClient,normalizedTitle,equalState} from '../src/lib/portal/google-calendar.ts';

const mappings=[
 {alias:'Akash',client_id:'aakash-id'},
 {alias:'Aakash',client_id:'aakash-id'},
 {alias:'Susie',client_id:'susie-id'}
];

test('calendar title matches only one explicitly authorised CGP athlete',()=>{
 assert.equal(matchingClient('Akash',mappings),'aakash-id');
 assert.equal(matchingClient('aakash',mappings),'aakash-id');
 assert.equal(matchingClient('  AKASH   ',mappings),'aakash-id');
 assert.equal(matchingClient('Susie',mappings),'susie-id');
 assert.equal(matchingClient('Review Akash medical report',mappings),null);
 assert.equal(matchingClient('Akash and Susie',mappings),null);
 assert.equal(matchingClient('Akash PT',mappings),null);
 assert.equal(matchingClient('Private appointment',mappings),null);
 assert.equal(matchingClient('Aka',mappings),null);
});

test('duplicated aliases are rejected as ambiguous and cannot select another client',()=>{
 assert.equal(matchingClient('Akash',[{alias:'Akash',client_id:'aakash-id'},{alias:'akASH',client_id:'someone-else'}]),null);
 assert.equal(normalizedTitle(' Ánna '),normalizedTitle('ánna'));
});

test('OAuth state comparison is exact and cannot accept mismatched or missing values',()=>{
 const state='EXAMPLESTATEEXAMPLESTATEEXAMPLESTATE';
 assert.equal(equalState(state,state),true);
 assert.equal(equalState(state,'EXAMPLESTATEEXAMPLESTATEEXAMPLESTATe'),false);
 assert.equal(equalState(state,null),false);
 assert.equal(equalState('',state),false);
});

test('cron route cannot return bookings without a bearer credential',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/app/api/cron/cgp-calendar/route.ts',import.meta.url),'utf8');
 assert.ok(src.includes("request.headers.get('authorization')"));
 assert.ok(src.includes('timingSafeEqual'));
 assert.ok(src.includes("status:401"));
});

test('Google event import preserves only its generic CGP booking title, not private calendar text',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../db/cgp-calendar-sync.sql',import.meta.url),'utf8');
 assert.ok(src.includes("title='Coaching session'"));
 assert.ok(src.includes("values(target,pack,'Coaching session'"));
 assert.ok(src.includes('cgp_calendar_aliases'));
 assert.ok(src.includes("status='scheduled'"));
});
