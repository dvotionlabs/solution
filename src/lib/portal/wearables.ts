import {createHmac,timingSafeEqual} from 'node:crypto';
export function verifyTerra(body:string,signature:string|null,secret:string,now=Date.now()){
 if(!secret||!signature)return false;const parts=signature.split(',').map(p=>p.trim().split('='));const times=parts.filter(p=>p[0]==='t');
 if(times.length!==1||!/^\d{10}$/.test(times[0][1]||''))return false;const t=times[0][1];if(Math.abs(now/1000-Number(t))>300)return false;
 const expected=createHmac('sha256',secret).update(`${t}.${body}`).digest();
 return parts.some(([key,value])=>key==='v1'&&/^[a-f0-9]{64}$/i.test(value||'')&&timingSafeEqual(Buffer.from(value,'hex'),expected));
}
type Obj=Record<string,unknown>;
function obj(v:unknown):Obj{return v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};}
function number(v:unknown,max:number){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max?v:null;}
function string(v:unknown){return typeof v==='string'?v:'';}
export function normaliseTerra(input:unknown){
 const payload=obj(input),user=obj(payload.user),type=string(payload.type),userId=string(user.user_id);
 if(type==='healthcheck')return {type:'healthcheck'};
 if(type==='auth'&&payload.status==='success')return {type:'auth',user_id:userId,reference_id:string(user.reference_id),provider:string(user.provider)};
 if(type==='auth_success')return {type:'auth',user_id:userId,reference_id:string(user.reference_id),provider:string(user.provider)};
 if(type==='deauth'||type==='access_revoked')return {type:'revoked',user_id:userId};
 if(type==='connection_error')return {type:'error',user_id:userId};
 if(type==='user_reauth')return {type:'reauth',user_id:string(obj(payload.old_user).user_id),new_user_id:string(obj(payload.new_user).user_id)};
 if(!['daily','sleep'].includes(type)||!userId||!Array.isArray(payload.data))return null;
 const metrics=payload.data.slice(0,1000).flatMap(value=>{
  const item=obj(value),meta=obj(item.metadata),start=string(meta.start_time),end=string(meta.end_time);
  if(!/^\d{4}-\d{2}-\d{2}T/.test(start)||!Number.isFinite(Date.parse(start)))return [];
  const heart=obj(obj(item.heart_rate_data).summary);
  const asleep=obj(obj(item.sleep_durations_data).asleep);
  // Provider-local calendar day; a sleep session belongs to its waking date.
  const validEnd=/^\d{4}-\d{2}-\d{2}T/.test(end)&&Number.isFinite(Date.parse(end));
  const day=(type==='sleep'&&validEnd?end:start).slice(0,10);
  const sourceId=type==='daily'?day:string(meta.summary_id)||start;
  const sleep=number(asleep.duration_asleep_state_seconds,86400);
  const steps=number(obj(item.distance_data).steps,250000),resting=number(heart.resting_hr_bpm,250);
  return [{day,source_id:sourceId,steps:type==='daily'&&steps!==null?Math.round(steps):null,sleep_seconds:type==='sleep'&&sleep!==null?Math.round(sleep):null,hrv_rmssd:number(heart.avg_hrv_rmssd,1000),hrv_sdnn:number(heart.avg_hrv_sdnn,1000),resting_hr:resting!==null&&resting>=10?resting:null,measured_at:validEnd?new Date(end).toISOString():new Date(start).toISOString()}];
 });
 return {type,user_id:userId,metrics};
}
