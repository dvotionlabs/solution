import 'server-only';
import {googleEvents,googleRefresh,unsealCalendarTokens,sealCalendarTokens} from './google-calendar';

type Result={connected:boolean;created?:number;updated?:number;cancelled?:number;completed?:number;credits_assigned?:number;skipped?:number;processed?:number;monthly?:unknown};
type Data={connected?:boolean;encrypted_tokens?:string;account_email?:string;calendar_id?:string};

function endpoint(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('CGP database is not configured.');
 return {url,key};
}
async function rpc(name:string,args:Record<string,unknown>):Promise<unknown>{
 const {url,key}=endpoint();
 const response=await fetch(url+'/rest/v1/rpc/'+name,{
  method:'POST',headers:{apikey:key,'Content-Type':'application/json'},
  body:JSON.stringify(args),cache:'no-store',signal:AbortSignal.timeout(26000)
 });
 if(!response.ok)throw new Error('CGP calendar database operation failed ('+response.status+').');
 const text=await response.text();return text?JSON.parse(text):null;
}
export async function synchronizeGoogleCalendar():Promise<Result>{
 const key=process.env.CRON_SECRET;
 if(!key||key.length<30)throw new Error('CGP calendar sync is not securely configured.');
 // Monthly allocations renew independently, even before Google OAuth is connected.
 const monthly=await rpc('cgp_monthly_ensure',{p_key:key});
 const state=await rpc('cgp_calendar_sync_state',{p_key:key}) as Data;
 if(!state.connected||!state.encrypted_tokens)return {connected:false,monthly};
 if(!process.env.CGP_GOOGLE_CLIENT_ID||!process.env.CGP_GOOGLE_CLIENT_SECRET)throw new Error('Google Calendar developer application must be configured.');
 let encrypted=state.encrypted_tokens;
 try{
  let tokens=unsealCalendarTokens(encrypted);
  if(tokens.expires_at<Date.now()+180000){
   tokens=await googleRefresh(tokens);
   encrypted=sealCalendarTokens(tokens);
   await rpc('cgp_calendar_sync_tokens',{p_key:key,p_encrypted_tokens:encrypted,p_error:null});
  }
  const from=new Date(Date.now()-45*86400000);
  const until=new Date(Date.now()+75*86400000);
  // Always collect *all* pages before the database applies any update/cancellation.
  const events=await googleEvents(tokens.access_token,from,until);
  const args={p_key:key,p_events:events,p_window_start:from.toISOString(),p_window_end:until.toISOString()};
  const applied=await rpc('cgp_calendar_sync_apply',args) as Omit<Result,'connected'>;
  const reconciled=await rpc('cgp_calendar_sync_finalize',args) as Omit<Result,'connected'>;
  return {connected:true,...applied,...reconciled,monthly,cancelled:Number(applied.cancelled||0)+Number(reconciled.cancelled||0)};
 }catch(error){
  // Do not send titles, credentials, tokens, Google event IDs or client details into logs.
  const message=error instanceof Error?error.message:'Unable to synchronise Google Calendar.';
  await rpc('cgp_calendar_sync_tokens',{p_key:key,p_encrypted_tokens:null,p_error:message.slice(0,180)}).catch(()=>{});
  throw error;
 }
}
