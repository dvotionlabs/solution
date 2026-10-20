import {cookies} from 'next/headers';
import {member} from '@/lib/portal/server';
import {callbackUrl,decodeAttempt,decryptTokens,encryptTokens,exchangeCode,oauthCookie,ready,stateMatches} from '@/lib/portal/direct-wearables';

const finish=(status:string)=>Response.redirect('https://cgp-dvotion.vercel.app/portal?tab=wearables&device='+encodeURIComponent(status),303);
export async function GET(request:Request){
 const query=new URL(request.url).searchParams;
 const jar=await cookies();
 const attempt=decodeAttempt(jar.get(oauthCookie)?.value);
 jar.delete(oauthCookie); // One-time, HttpOnly OAuth CSRF state.
 if(!attempt||!stateMatches(query.get('state'),attempt.state))return finish('expired');
 if(query.has('error'))return finish('declined');
 const code=query.get('code');
 if(!code||code.length>2000||!ready(attempt.provider))return finish('setup');
 try{
  const {db,profile}=await member();
  if(profile.id!==attempt.profile_id)return finish('login');
  const c=await db.from('cgp_wearable_connections').select('id,provider,status').eq('id',attempt.connection_id).eq('client_id',profile.id).eq('provider',attempt.provider).eq('status','pending').maybeSingle();
  if(c.error||!c.data)return finish('expired');
  const tokens=await exchangeCode(attempt.provider,code,attempt.verifier);
  // The two APIs use the app's client secret for exchanging tokens.
  // Store only authenticated, encrypted values, never plain provider tokens.
  const saved=await db.from('cgp_direct_wearable_tokens').upsert({connection_id:c.data.id,token_ciphertext:encryptTokens(tokens),updated_at:new Date().toISOString()},{onConflict:'connection_id'});
  if(saved.error)throw new Error('Could not store authorisation securely.');
  const ingestKey=process.env.CGP_WEARABLE_INGEST_KEY;
  if(!ingestKey)throw new Error('Secure ingestion is not configured.');
  const activated=await db.rpc('cgp_ingest_wearable',{p_key:ingestKey,p_event:{type:'auth',reference_id:c.data.id,provider:attempt.provider,user_id:attempt.provider+':'+c.data.id}});
  if(activated.error){
   await db.from('cgp_direct_wearable_tokens').delete().eq('connection_id',c.data.id);
   throw new Error('Could not activate the new connection.');
  }
  return finish('connected');
 }catch{return finish('failed');}
}
