import {fail,jsonBody,member,PortalError,reply} from '@/lib/portal/server';
import {ready} from '@/lib/portal/direct-wearables';
import {dateValue,idValue,uuid,londonDay,providers,textValue,timestamp,youtubeChannel,optionalYoutubeId} from '@/lib/portal/model';
import {sameOrigin} from '@/lib/validation';
import {rateLimited} from '@/lib/rate-limit';
export async function GET(){try{
 const {db,profile}=await member();const isAdmin=profile.role==='admin';
 // PostgREST caps each response; page through it so balances include every booking.
 async function allRows<T>(makeQuery:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>){
  const rows:T[]=[];for(let from=0;;from+=1000){const r=await makeQuery(from,from+999);if(r.error)return {data:null,error:r.error};rows.push(...r.data||[]);if(!r.data||r.data.length<1000)return {data:rows,error:null};}
 }
 const results=await Promise.all([
  allRows((a,b)=>db.from('cgp_profiles').select('*').order('name').order('id').range(a,b)),allRows((a,b)=>db.from('cgp_session_credits').select('*').order('id').range(a,b)),
  allRows((a,b)=>db.from('cgp_bookings').select('*').order('starts_at',{ascending:false}).order('id').range(a,b)),allRows((a,b)=>db.from('cgp_exercises').select('*').order('title').order('id').range(a,b)),
  allRows((a,b)=>db.from('cgp_homework').select('*').order('client_id').order('sort_order').order('created_at',{ascending:false}).order('id').range(a,b)),allRows((a,b)=>db.from('cgp_homework_logs').select('*').gte('done_on',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order('id').range(a,b)),
  allRows((a,b)=>db.from('cgp_wearable_connections').select('id,client_id,provider,status,synced_at,consent_at').order('id').range(a,b)),allRows((a,b)=>db.from('cgp_wearable_metrics').select('*').gte('day',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order('day',{ascending:false}).order('connection_id').order('kind').order('source_id').range(a,b)),db.from('cgp_portal_settings').select('*'),db.from('cgp_monthly_plans').select('client_id,sessions_per_month,start_month')
 ]);
 if(results.some(r=>r.error))throw new PortalError('Your portal could not be loaded. Please try again.',503);
 const [clients,credits,bookings,exercises,homework,logs,connections,metrics,settings,monthlyPlans]=results.map(r=>r.data||[]);
 return reply({asOf:new Date().toISOString(),profile,clients:isAdmin?clients:[],credits,bookings,exercises,homework,logs,connections,metrics,youtubeChannel:settings.find(s=>s.key==='youtube_channel')?.value||'',monthlyPlans,wearablesReady:ready('WHOOP')||ready('OURA'),providerReady:{WHOOP:ready('WHOOP'),OURA:ready('OURA'),GARMIN:false},providers:['WHOOP','OURA','GARMIN']});
 }catch(error){return fail(error);}}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Please use the CGP website.'},403);
 if(rateLimited(request,'portal-write',150))return reply({error:'Please wait a moment and try again.'},429);
 try{const {db,profile}=await member();const b=await jsonBody(request);
  if(b.action==='homework-done'){
   const homework=idValue(b.homework_id);const today=londonDay();
   const r=b.done===true?await db.from('cgp_homework_logs').upsert({homework_id:homework,client_id:profile.id,done_on:today},{onConflict:'homework_id,done_on',ignoreDuplicates:true}):await db.from('cgp_homework_logs').delete().eq('homework_id',homework).eq('client_id',profile.id).eq('done_on',today);
   if(r.error)throw new Error('This homework update could not be saved.');return reply({ok:true});
  }
  if(profile.role!=='admin')throw new PortalError('Admin access required.',403);
  if(b.action==='client'){
   const name=textValue(b.name,2,100),email=textValue(b.email,5,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email.');
   const r=await db.from('cgp_profiles').insert({name,email,role:'athlete'}).select('id').single();if(r.error)throw new Error(r.error.code==='23505'?'This client email already exists.':'Client could not be added.');return reply({ok:true,id:r.data.id});
  }
  if(b.action==='client-active'){const id=idValue(b.client_id);if(id===profile.id)throw new Error('You cannot deactivate your own account.');const r=await db.from('cgp_profiles').update({active:b.active===true}).eq('id',id).eq('role','athlete');if(r.error)throw new Error('Client could not be updated.');return reply({ok:true});}
  if(b.action==='invite'){const r=await db.rpc('cgp_issue_portal_invite',{p_client:idValue(b.client_id)});if(r.error)throw new Error('Access link could not be created.');return reply({ok:true,url:`${new URL(request.url).origin}/portal#invite=${r.data}`});}
  if(b.action==='credit'){
   const quantity=Number(b.quantity);if(!Number.isInteger(quantity)||quantity<1||quantity>500)throw new Error('Enter a session total between 1 and 500.');
   const r=await db.from('cgp_session_credits').insert({client_id:idValue(b.client_id),label:textValue(b.label,2,120),quantity,starts_on:dateValue(b.starts_on),expires_on:b.expires_on?dateValue(b.expires_on):null,source_reference:b.source_reference?textValue(b.source_reference,1,150):null});
   if(r.error)throw new Error(r.error.code==='23505'?'That payment reference has already been credited.':'Session pack could not be added. Check the dates.');return reply({ok:true});
  }
  if(b.action==='monthly-plan'){
   const client=idValue(b.client_id);
   const count=b.sessions_per_month===null||b.sessions_per_month===''?0:Number(b.sessions_per_month);
   if(![0,4,8].includes(count))throw new Error('Choose no automatic monthly plan, 4 sessions, or 8 sessions.');
   const r=await db.rpc('cgp_monthly_plan_set',{p_client:client,p_sessions:count});
   if(r.error)throw new Error(r.error.message||'Monthly sessions could not be configured.');
   const blocked=Number(r.data?.allocations?.blocked||0);
   return reply({ok:true,
    message:count===0?'Monthly renewals stopped; existing allocations remain unchanged.':
     blocked?'Monthly plan saved. Existing session packs overlap this month, so duplicate credits were not added. Review session allocations.':
     'Monthly plan saved. Sessions renew from the 1st through the last day each month.',
    allocation:r.data});
  }
  if(b.action==='booking'){
   const starts=timestamp(b.starts_at),ends=timestamp(b.ends_at);if(Date.parse(ends)<=Date.parse(starts)||Date.parse(ends)-Date.parse(starts)>8*3600000)throw new Error('Check the session start and end time.');
   const row={client_id:idValue(b.client_id),credit_id:b.credit_id?idValue(b.credit_id):null,title:textValue(b.title,2,120),starts_at:starts,ends_at:ends,location:textValue(b.location,1,200),notes:textValue(b.notes||'',0,2000)};
   const r=b.id?await db.from('cgp_bookings').update(row).eq('id',idValue(b.id)):await db.from('cgp_bookings').insert(row);
   if(r.error)throw new Error(r.error.code==='P0001'?r.error.message:'Booking could not be saved.');return reply({ok:true});
  }
  if(b.action==='booking-status'){if(!['scheduled','completed','cancelled','no_show'].includes(String(b.status)))throw new Error('Choose a valid status.');const r=await db.from('cgp_bookings').update({status:b.status}).eq('id',idValue(b.id));if(r.error)throw new Error(r.error.code==='P0001'?r.error.message:'Booking could not be updated.');return reply({ok:true});}
  if(b.action==='exercise'){
   const video=optionalYoutubeId(b.video);
   const row={title:textValue(b.title,2,120),category:textValue(b.category,1,60),youtube_id:video,cues:textValue(b.cues||'',0,4000),active:b.active!==false};
   const r=b.id?await db.from('cgp_exercises').update(row).eq('id',idValue(b.id)):await db.from('cgp_exercises').insert(row);if(r.error)throw new Error('Exercise could not be saved.');return reply({ok:true});
  }
  if(b.action==='homework-custom'){
   // One transaction creates an optional-video exercise and its athlete assignment.
   // The RPC enforces active athletes, admin-only access and existing RLS policies.
   const args={
    p_client:idValue(b.client_id),
    p_title:textValue(b.new_title,2,120),
    p_category:textValue(b.new_category,1,60),
    p_cues:textValue(b.new_cues||'',0,4000),
    p_prescription:textValue(b.prescription,1,500),
    p_coach_note:textValue(b.coach_note||'',0,2000)
   };
   const r=await db.rpc('cgp_create_text_homework',args);
   if(r.error)throw new Error(r.error.message||'Written homework could not be assigned.');
   return reply({ok:true,id:r.data,message:'Written exercise created and assigned. No video required.'});
  }
  if(b.action==='homework'){
   const row={client_id:idValue(b.client_id),exercise_id:idValue(b.exercise_id),prescription:textValue(b.prescription,1,500),coach_note:textValue(b.coach_note||'',0,2000),active:true};
   const r=await db.from('cgp_homework').insert(row);if(r.error)throw new Error('Homework could not be assigned.');return reply({ok:true});
  }
  if(b.action==='homework-edit'){
   const id=idValue(b.id),clientId=idValue(b.client_id),exerciseId=idValue(b.exercise_id);
   const [existing,source]=await Promise.all([
    db.from('cgp_homework').select('id,client_id,exercise_id').eq('id',id)
     .eq('client_id',clientId).eq('active',true).maybeSingle(),
    db.from('cgp_exercises').select('id,title,active').eq('id',exerciseId).maybeSingle(),
   ]);
   if(existing.error||!existing.data)throw new PortalError('This athlete assignment is unavailable. Refresh the page.',404);
   if(source.error||!source.data||(!source.data.active&&existing.data.exercise_id!==exerciseId))
    throw new PortalError('Select a valid library exercise.',400);
   const title=textValue(b.title,2,120);
   const update={
    exercise_id:exerciseId,
    title_override:title===source.data.title?null:title,
    prescription:textValue(b.prescription,1,500),
    coach_note:textValue(b.coach_note||'',0,2000),
   };
   const result=await db.from('cgp_homework').update(update)
    .eq('id',id).eq('client_id',clientId).eq('active',true).select('id').maybeSingle();
   if(result.error||!result.data)throw new Error('Could not update the athlete assignment.');
   return reply({ok:true,message:'Homework updated.'});
  }
  if(b.action==='homework-reorder'){
   const client=idValue(b.client_id);
   if(!Array.isArray(b.order)||b.order.length>1000||b.order.some(id=>!uuid(id)))throw new Error('Please refresh before changing the exercise order.');
   const r=await db.rpc('cgp_homework_reorder',{p_client:client,p_order:b.order});
   if(r.error)throw new Error(r.error.message||'Could not save this client\'s exercise order.');
   return reply({ok:true,message:'Exercise order saved.',count:r.data});
  }
  if(b.action==='archive-homework'){const r=await db.from('cgp_homework').update({active:false}).eq('id',idValue(b.id));if(r.error)throw new Error('Homework could not be updated.');return reply({ok:true});}
  if(b.action==='channel'){const url=youtubeChannel(b.url);if(url===null)throw new Error('Use a YouTube channel link, such as youtube.com/@yourchannel.');const r=await db.from('cgp_portal_settings').update({value:url}).eq('key','youtube_channel');if(r.error)throw new Error('Channel could not be saved.');return reply({ok:true});}
  throw new Error('Unknown action.');
 }catch(error){return fail(error);}
}
