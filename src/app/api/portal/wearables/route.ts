import {fail,jsonBody,member,reply,wearablesReady} from '@/lib/portal/server';
import {idValue,providers} from '@/lib/portal/model';
import {sameOrigin} from '@/lib/validation';
import {rateLimited} from '@/lib/rate-limit';
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Please use the CGP website.'},403);
 if(rateLimited(request,'wearable-connect',30))return reply({error:'Please try again in a few minutes.'},429);
 try{const {db}=await member();const b=await jsonBody(request);
  const headers={'x-api-key':process.env.TERRA_API_KEY||'','dev-id':process.env.TERRA_DEV_ID||'','Content-Type':'application/json'};
  if(b.action==='disconnect'){
   const r=await db.rpc('cgp_disconnect_wearable',{p_connection:idValue(b.id)});if(r.error)throw new Error('Connection could not be removed.');
   let providerRevoked=!r.data;
   if(r.data&&wearablesReady()){try{const remote=await fetch(`https://api.tryterra.co/v2/auth/deauthenticateUser?user_id=${encodeURIComponent(r.data)}`,{method:'DELETE',headers,signal:AbortSignal.timeout(12000)});providerRevoked=remote.ok;}catch{}}
   return reply({ok:true,message:providerRevoked?'Device disconnected and its stored readings deleted.':'Sharing is stopped and stored readings are deleted. Please also revoke CGP/Terra access in your wearable app.'});
  }
  if(!wearablesReady())return reply({error:'Wearable connections are not available yet. Chris is completing the integration setup.'},503);
  if(b.consent!==true||!providers.includes(String(b.provider)))throw new Error('Choose a supported device and agree to share your data.');
  const c=await db.rpc('cgp_start_wearable',{p_provider:b.provider});if(c.error)throw new Error(c.error.message);
  const origin=new URL(request.url).origin;
  const remote=await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession',{method:'POST',headers,body:JSON.stringify({reference_id:c.data,providers:b.provider,language:'en',auth_success_redirect_url:`${origin}/portal?tab=wearables&connected=1`,auth_failure_redirect_url:`${origin}/portal?tab=wearables&connected=0`}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  const data=await remote.json();
  if(!remote.ok||typeof data.url!=='string')throw new Error('The device connection could not be opened. Please try again.');
  const url=new URL(data.url);if(url.protocol!=='https:'||!(url.hostname==='tryterra.co'||url.hostname.endsWith('.tryterra.co')))throw new Error('Invalid connection response.');
  return reply({url:data.url});
 }catch(error){return fail(error);}
}
