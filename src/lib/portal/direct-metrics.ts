/** Provider-to-CGP metric mapping. Data is never inferred from another metric's score. */
type ObjectValue=Record<string,unknown>;
export type DirectMetric={
 kind:'daily'|'sleep';day:string;source_id:string;
 steps:number|null;sleep_seconds:number|null;hrv_rmssd:number|null;hrv_sdnn:number|null;resting_hr:number|null;measured_at:string;
};
function obj(value:unknown):ObjectValue{return value&&typeof value==='object'&&!Array.isArray(value)?value as ObjectValue:{};}
function arr(value:unknown):ObjectValue[]{return Array.isArray(value)?value.map(obj):[];}
function num(value:unknown,min:number,max:number):number|null{
 return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:null;
}
function date(value:unknown):string|null{
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))?value:null;
}
function stamp(value:unknown,day:string):string{
 if(typeof value==='string'&&Number.isFinite(Date.parse(value)))return new Date(value).toISOString();
 return day+'T12:00:00.000Z';
}
function wakingDay(end:unknown,offset:unknown):string|null{
 if(typeof end!=='string'||!Number.isFinite(Date.parse(end)))return null;
 const t=Date.parse(end);
 if(typeof offset==='string'&&/^[+-]\d{2}:\d{2}$/.test(offset)){
  const sign=offset[0]==='-'?-1:1;
  const shifted=t+sign*(Number(offset.slice(1,3))*60+Number(offset.slice(4,6)))*60000;
  return new Date(shifted).toISOString().slice(0,10);
 }
 return new Date(t).toISOString().slice(0,10);
}
function metric(kind:DirectMetric['kind'],day:string,source:string,measured_at:string):DirectMetric{
 return {kind,day,source_id:source.slice(0,160),steps:null,sleep_seconds:null,hrv_rmssd:null,hrv_sdnn:null,resting_hr:null,measured_at};
}
/** WHOOP recovery is RMSSD, not SDNN; sleep is duration of light+SWS+REM. */
export function whoopMetrics(input:{sleep:unknown;recovery:unknown;cycles:unknown}):DirectMetric[]{
 const result:DirectMetric[]=[];
 const sleeps=arr(obj(input.sleep).records),waking=new Map<string,string>();
 for(const item of sleeps){
  const day=wakingDay(item.end,item.timezone_offset);
  if(!day)continue;
  const id=typeof item.id==='string'?item.id:String(item.cycle_id||'');
  if(id)waking.set(id,day);
  const stages=obj(obj(item.score).stage_summary);
  const light=num(stages.total_light_sleep_time_milli,0,86400000);
  const slow=num(stages.total_slow_wave_sleep_time_milli,0,86400000);
  const rem=num(stages.total_rem_sleep_time_milli,0,86400000);
  const asleep=light!==null&&slow!==null&&rem!==null?Math.round((light+slow+rem)/1000):null;
  if(asleep===null||asleep>86400)continue;
  const m=metric('sleep',day,'whoop:sleep:'+id,stamp(item.end,day));m.sleep_seconds=asleep;result.push(m);
 }
 for(const item of arr(obj(input.recovery).records)){
  if(item.score_state!=='SCORED')continue;
  const day=waking.get(String(item.sleep_id))||wakingDay(item.created_at,item.timezone_offset);
  if(!day)continue;
  const score=obj(item.score),hrv=num(score.hrv_rmssd_milli,0,1000),rhr=num(score.resting_heart_rate,10,250);
  if(hrv===null&&rhr===null)continue;
  const m=metric('daily',day,'whoop:recovery:'+String(item.cycle_id||day),stamp(item.updated_at,day));
  m.hrv_rmssd=hrv;m.resting_hr=rhr;result.push(m);
 }
 for(const item of arr(obj(input.cycles).records)){
  const day=wakingDay(item.start,item.timezone_offset),steps=num(item.step_count,0,250000);
  if(!day||steps===null)continue;
  const m=metric('daily',day,'whoop:steps:'+day,stamp(item.start,day));
  m.steps=Math.round(steps);result.push(m);
 }
 return result.slice(0,200);
}
/** Oura nightly average HRV is RMSSD. Lowest overnight HR != resting HR and is not relabelled. */
export function ouraMetrics(input:{sleep:unknown;activity:unknown}):DirectMetric[]{
 const result:DirectMetric[]=[];
 for(const item of arr(obj(input.sleep).data)){
  const day=date(item.day),sleep=num(item.total_sleep_duration,0,86400),hrv=num(item.average_hrv,0,1000);
  if(!day||(sleep===null&&hrv===null))continue;
  const m=metric('sleep',day,'oura:sleep:'+String(item.id||day),stamp(item.bedtime_end,day));
  m.sleep_seconds=sleep!==null?Math.round(sleep):null;m.hrv_rmssd=hrv;result.push(m);
 }
 for(const item of arr(obj(input.activity).data)){
  const day=date(item.day),steps=num(item.steps,0,250000);
  if(!day||steps===null)continue;
  const m=metric('daily',day,'oura:activity:'+day,stamp(undefined,day));
  m.steps=Math.round(steps);result.push(m);
 }
 return result.slice(0,200);
}
