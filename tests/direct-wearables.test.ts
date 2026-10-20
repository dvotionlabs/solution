import test from 'node:test';
import assert from 'node:assert/strict';
import {ouraMetrics,whoopMetrics} from '../src/lib/portal/direct-metrics.ts';

test('WHOOP recovery RMSSD, resting HR, sleep stages and actual steps retain their distinct sources',()=>{
 const input={
  sleep:{records:[{id:'night-one',end:'2026-10-15T06:00:00.000Z',timezone_offset:'+01:00',score:{stage_summary:{total_light_sleep_time_milli:13000000,total_slow_wave_sleep_time_milli:6000000,total_rem_sleep_time_milli:5000000}}}]},
  recovery:{records:[{cycle_id:123,sleep_id:'night-one',score_state:'SCORED',updated_at:'2026-10-15T07:00:00Z',score:{hrv_rmssd_milli:61.5,resting_heart_rate:49}}]},
  cycles:{records:[{start:'2026-10-14T07:00:00Z',timezone_offset:'+01:00',step_count:10555}]},
 };
 const results=whoopMetrics(input);
 assert.equal(results.length,3);
 const sleeping=results.find(x=>x.kind==='sleep');
 assert.equal(sleeping?.day,'2026-10-15');
 assert.equal(sleeping?.sleep_seconds,24000);
 const recovery=results.find(x=>x.hrv_rmssd!==null);
 assert.equal(recovery?.hrv_rmssd,61.5);
 assert.equal(recovery?.hrv_sdnn,null);
 assert.equal(recovery?.resting_hr,49);
 assert.equal(results.find(x=>x.steps!==null)?.steps,10555);
});
test('Oura uses actual sleep seconds, RMSSD and activity steps; never treats the lowest nighttime HR as resting HR',()=>{
 const result=ouraMetrics({
  sleep:{data:[{id:'oursleep',day:'2026-10-14',total_sleep_duration:24800,average_hrv:47.5,lowest_heart_rate:42,bedtime_end:'2026-10-14T07:00:00Z'}]},
  activity:{data:[{day:'2026-10-14',steps:8020}]}
 });
 assert.equal(result.length,2);
 assert.equal(result.find(m=>m.kind==='sleep')?.sleep_seconds,24800);
 assert.equal(result.find(m=>m.kind==='sleep')?.hrv_rmssd,47.5);
 assert.equal(result.find(m=>m.kind==='sleep')?.resting_hr,null);
 assert.equal(result.find(m=>m.kind==='daily')?.steps,8020);
});
test('missing / implausible wearable metrics stay null rather than becoming invented observations',()=>{
 const result=whoopMetrics({sleep:{records:[{id:'x',end:'2026-10-12T07:00:00Z',score:{stage_summary:{total_light_sleep_time_milli:999999999}}}]},recovery:{records:[]},cycles:{records:[]}});
 assert.equal(result.length,0);
 const oura=ouraMetrics({sleep:{data:[{day:'2026-10-12',total_sleep_duration:null,average_hrv:null}]},activity:{data:[{day:'2026-10-12',steps:-22}]}});
 assert.equal(oura.length,0);
});
