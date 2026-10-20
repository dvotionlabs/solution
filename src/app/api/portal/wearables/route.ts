import {cookies} from 'next/headers';
import {fail,jsonBody,member,PortalError,reply} from '@/lib/portal/server';
import {idValue} from '@/lib/portal/model';
import {sameOrigin} from '@/lib/validation';
import {rateLimited} from '@/lib/rate-limit';
import {asDirectProvider,authorisationUrl,decryptTokens,encodeAttempt,encryptTokens,newAttempt,oauthCookie,ready,refreshTokens,fetchProviderJson,revokeWhoop} from '@/lib/portal/direct-wearables';
import {whoopMetrics,ouraMetrics,type DirectMetric} from '@/lib/portal/direct-metrics';

async function writeReadings(db:Awaited<ReturnType<typeof member>>['db'],id:string,user_id:string,metrics:DirectMetric[]){
 const key=process.env.CGP_WEARABLE_INGEST_KEY;
 if(!key)throw new Error('Secure wearable ingestion is not configured.');
 for(const kind of ['daily','sleep'] as const){
  const batch=metrics.filter(m=>m.kind===kind);
  if(!batch.length)continue;
  const r=await db.rpc('cgp_ingest_wearable',{p_key:key,p_event:{type:kind,user_id,metrics:batch}});
  if(r.error)throw new Error('The provider responded, but the readings could not be saved.');
 }
}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Please use the CGP website.'},403);
 if(rateLimited(request,'wearable-connect',30))return reply({error:'Too many device requests. Try again shortly.'},429);
 try{
  const {db,profile}=await member();
  const body=await jsonBody(request);
  if(body.action==='connect'){
   if(body.consent!==true)throw new PortalError('Please agree to share these readings with your coach.',400);
   if(body.provider==='GARMIN')throw new PortalError('Garmin direct integration requires approval from Garmin Connect Developer Program. The request has not been approved yet.',503);
   const provider=asDirectProvider(body.provider);
   if(!provider)throw new PortalError('Direct connection is not yet available for this device.',503);
   if(!ready(provider))throw new PortalError(provider+' needs its developer app credentials before it can connect. No account or payment is required to wait.',503);
   const c=await db.rpc('cgp_start_wearable',{p_provider:provider});
   if(c.error||typeof c.data!=='string')throw new Error(c.error?.message||'Could not prepare the device connection.');
   const attempt=newAttempt(provider,c.data,profile.id);
   const jar=await cookies();
   jar.set(oauthCookie,encodeAttempt(attempt),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/portal/wearables/callback',maxAge:600});
   return reply({url:authorisationUrl(attempt)});
  }
  if(body.action==='disconnect'){
   const id=idValue(body.id);
   const c=await db.from('cgp_wearable_connections').select('id,provider,status').eq('id',id).eq('client_id',profile.id).maybeSingle();
   if(c.error||!c.data)throw new PortalError('Connection unavailable.',404);
   const provider=asDirectProvider(c.data.provider);
   if(!provider)throw new PortalError('This old connection uses a different provider; please contact CGP to disconnect it.',409);
   const stored=await db.from('cgp_direct_wearable_tokens').select('token_ciphertext').eq('connection_id',id).maybeSingle();
   if(stored.error)throw new Error('Could not access device authorisation.');
   let remoteRevoked=false;
   if(stored.data&&provider==='WHOOP'){
    try{remoteRevoked=await revokeWhoop(decryptTokens(stored.data.token_ciphertext).access_token);}catch{}
   }
   const erase=await db.from('cgp_direct_wearable_tokens').delete().eq('connection_id',id);
   if(erase.error)throw new Error('Connection token could not be deleted.');
   const disconnect=await db.rpc('cgp_disconnect_wearable',{p_connection:id});
   if(disconnect.error)throw new Error('Could not stop sharing device data.');
   return reply({ok:true,message:provider==='WHOOP'&&!remoteRevoked?'CGP data and access tokens deleted. Also remove CGP access in your WHOOP account.':provider==='OURA'?'CGP data and access tokens deleted. To revoke Oura authorisation remotely, also remove CGP in Oura connected apps.':'Device disconnected and stored measurements deleted.'});
  }
  if(body.action==='sync'){
   const id=idValue(body.id);
   const c=await db.from('cgp_wearable_connections').select('id,provider,status,external_user_id').eq('id',id).eq('client_id',profile.id).eq('status','connected').maybeSingle();
   if(c.error||!c.data)throw new PortalError('Your connected device could not be found.',404);
   const provider=asDirectProvider(c.data.provider);
   if(!provider||!c.data.external_user_id)throw new PortalError('Direct device sync is not active.',503);
   if(!ready(provider))throw new PortalError('Device developer connection is temporarily unavailable.',503);
   const t=await db.from('cgp_direct_wearable_tokens').select('token_ciphertext,last_sync_attempt_at').eq('connection_id',id).maybeSingle();
   if(t.error||!t.data)throw new PortalError('Your device needs to be connected again.',409);
   const attempted=t.data.last_sync_attempt_at?Date.parse(t.data.last_sync_attempt_at):0;
   if(attempted&&Date.now()-attempted<2*60000)return reply({ok:true,message:'CGP has checked this device recently. Try again in two minutes.'});
   const mark=await db.from('cgp_direct_wearable_tokens').update({last_sync_attempt_at:new Date().toISOString()}).eq('connection_id',id);
   if(mark.error)throw new Error('Could not prepare device sync.');
   let token=decryptTokens(t.data.token_ciphertext);
   if(token.expires_at<Date.now()+180000){
    token=await refreshTokens(provider,token);
    const saved=await db.from('cgp_direct_wearable_tokens').update({token_ciphertext:encryptTokens(token),updated_at:new Date().toISOString()}).eq('connection_id',id);
    if(saved.error)throw new Error('Could not securely save refreshed device authorisation.');
   }
   const start=new Date(Date.now()-30*86400000).toISOString();
   let metrics:DirectMetric[]=[];
   if(provider==='WHOOP'){
    const query='?start='+encodeURIComponent(start)+'&limit=25';
    const [sleep,recovery,cycles]=await Promise.all([
     fetchProviderJson(provider,'activity/sleep'+query,token.access_token),
     fetchProviderJson(provider,'recovery'+query,token.access_token),
     fetchProviderJson(provider,'cycle'+query,token.access_token),
    ]);
    metrics=whoopMetrics({sleep,recovery,cycles});
   }else{
    const today=new Date().toISOString().slice(0,10),from=start.slice(0,10),query='?start_date='+from+'&end_date='+today;
    const [sleep,activity]=await Promise.all([
     fetchProviderJson(provider,'sleep'+query,token.access_token),
     fetchProviderJson(provider,'daily_activity'+query,token.access_token),
    ]);
    metrics=ouraMetrics({sleep,activity});
   }
   await writeReadings(db,id,c.data.external_user_id,metrics);
   return reply({ok:true,message:metrics.length?metrics.length+' recent device readings synchronised.':'Connected successfully. The provider has no available readings for the last 30 days.'});
  }
  throw new PortalError('Unsupported device action.',400);
 }catch(error){return fail(error);}
}
