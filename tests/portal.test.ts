import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {sessionBalance,londonDay,londonToIso,londonInput,youtubeId,youtubeChannel,dateValue,type Credit,type Booking} from '../src/lib/portal/model.ts';
import {normaliseTerra,verifyTerra} from '../src/lib/portal/wearables.ts';
const credit=(id:string,quantity:number,starts_on='2026-01-01',expires_on:string|null=null):Credit=>({id,quantity,starts_on,expires_on,client_id:'one',label:'Sessions',source_reference:null});
const booking=(id:string,credit_id:string|null,status:Booking['status']):Booking=>({id,credit_id,status,client_id:'one',title:'Session',starts_at:'2026-10-10T12:00:00Z',ends_at:'2026-10-10T13:00:00Z',location:'London',notes:''});
test('booked credits remain owned, while completed/missed credits are used and cancellations release reservations',()=>{
 const packs=[credit('a',8),credit('b',4,'2025-01-01','2025-12-31'),credit('c',5,'2026-12-01')];
 const bookings=[booking('1','a','completed'),booking('2','a','no_show'),booking('3','a','scheduled'),booking('4','a','cancelled'),booking('5','b','completed'),booking('6','c','scheduled'),booking('7',null,'completed')];
 assert.deepEqual(sessionBalance(packs,bookings,'2026-10-10'),{total:8,used:2,booked:1,remaining:6,available:5});
 bookings[2].status='cancelled';assert.equal(sessionBalance(packs,bookings,'2026-10-10').available,6);
 assert.equal(sessionBalance([credit('a',4,'2026-10-10','2026-10-10')],[],'2026-10-10').total,4);
 assert.equal(sessionBalance([],[],'2026-10-10').remaining,0);
});
test('London dates honour BST, winter time and reject nonexistent spring clock-change times',()=>{
 assert.equal(londonToIso('2026-07-10T10:00'),'2026-07-10T09:00:00.000Z');
 assert.equal(londonToIso('2026-12-10T10:00'),'2026-12-10T10:00:00.000Z');
 assert.equal(londonInput('2026-07-10T09:00:00Z'),'2026-07-10T10:00');
 assert.equal(londonDay(new Date('2026-07-10T23:30:00Z')),'2026-07-11');
 assert.throws(()=>londonToIso('2026-03-29T01:30'));
 assert.throws(()=>dateValue('2026-02-30'));
});
test('video and channel links accept YouTube only',()=>{
 assert.equal(youtubeId('https://youtu.be/abcdefghijk'),'abcdefghijk');
 assert.equal(youtubeId('https://www.youtube.com/shorts/abcdefghijk'),'abcdefghijk');
 assert.equal(youtubeId('https://www.youtube.com/watch?v=abcdefghijk&t=40'),'abcdefghijk');
 for(const bad of ['https://youtube.com.evil.test/watch?v=abcdefghijk','javascript:alert(1)','http://youtu.be/abcdefghijk','https://evil.test/abcdefghijk'])assert.equal(youtubeId(bad),null);
 assert.equal(youtubeChannel('https://www.youtube.com/@cgp'),'https://www.youtube.com/@cgp');
 assert.equal(youtubeChannel('https://youtube.com/watch?v=abcdefghijk'),null);
});
test('Terra verification rejects tampering, replay, wrong schemes, secrets and malformed signatures',()=>{
 const body='{"type":"daily","user":{"user_id":"one"}}',secret='test-fixture-only',now=1791633600000,t=String(now/1000);
 const digest=createHmac('sha256',secret).update(`${t}.${body}`).digest('hex'),signature=`t=${t},v1=${digest}`;
 assert.equal(verifyTerra(body,signature,secret,now),true);
 assert.equal(verifyTerra(body+' ',signature,secret,now),false);
 assert.equal(verifyTerra(body,signature,secret,now+301000),false);
 assert.equal(verifyTerra(body,signature,'wrong',now),false);
 assert.equal(verifyTerra(body,signature.replace('v1=','v0='),secret,now),false);
 assert.equal(verifyTerra(body,`t=${t},v1=bad`,secret,now),false);
 assert.equal(verifyTerra(body,`t=${t},${signature}`,secret,now),false);
});
test('wearable normalisation preserves real zero, missing values and HRV measurement methods',()=>{
 const daily=normaliseTerra({type:'daily',user:{user_id:'one'},data:[{metadata:{start_time:'2026-10-10T00:00:00+01:00',end_time:'2026-10-11T00:00:00+01:00'},distance_data:{steps:0},heart_rate_data:{summary:{avg_hrv_rmssd:54,avg_hrv_sdnn:72,resting_hr_bpm:0}}}]});
 assert.ok(daily&&'metrics' in daily&&daily.metrics);assert.equal(daily.metrics[0].steps,0);assert.equal(daily.metrics[0].sleep_seconds,null);assert.equal(daily.metrics[0].hrv_rmssd,54);assert.equal(daily.metrics[0].hrv_sdnn,72);assert.equal(daily.metrics[0].resting_hr,null);assert.equal(daily.metrics[0].day,'2026-10-10');
 const sleep=normaliseTerra({type:'sleep',user:{user_id:'one'},data:[{metadata:{start_time:'2026-10-09T23:00:00+01:00',end_time:'2026-10-10T07:00:00+01:00'},sleep_durations_data:{asleep:{duration_asleep_state_seconds:25200}}}]});
 assert.ok(sleep&&'metrics' in sleep&&sleep.metrics);assert.equal(sleep.metrics[0].day,'2026-10-10');assert.equal(sleep.metrics[0].sleep_seconds,25200);assert.equal(sleep.metrics[0].hrv_rmssd,null);assert.equal(sleep.metrics[0].steps,null);
 assert.equal(normaliseTerra({type:'daily',data:[]}),null);
 assert.deepEqual(normaliseTerra({type:'access_revoked',user:{user_id:'one'}}),{type:'revoked',user_id:'one'});
 assert.deepEqual(normaliseTerra({type:'user_reauth',old_user:{user_id:'one'},new_user:{user_id:'two'}}),{type:'reauth',user_id:'one',new_user_id:'two'});
});
