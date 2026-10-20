import {randomBytes} from 'node:crypto';
export {equalState} from './calendar-match';
import {decryptTokens,encryptTokens,type DirectTokens} from './direct-wearables';

export const GOOGLE_CALLBACK='https://cgp-dvotion.vercel.app/api/admin/calendar/callback';
export const CALENDAR_STATE_COOKIE='cgp_google_calendar_state';
const SCOPE='openid email https://www.googleapis.com/auth/calendar.events.readonly';

export type GoogleTokens=DirectTokens;
export interface EventForImport{id:string;summary:string;start:string;end:string;status:'confirmed'}

function creds(){
 const client_id=process.env.CGP_GOOGLE_CLIENT_ID;
 const client_secret=process.env.CGP_GOOGLE_CLIENT_SECRET;
 if(!client_id||!client_secret)throw new Error('Google Calendar developer credentials have not been configured.');
 return {client_id,client_secret};
}
export function googleReady(){return Boolean(process.env.CGP_GOOGLE_CLIENT_ID&&process.env.CGP_GOOGLE_CLIENT_SECRET&&process.env.CGP_DIRECT_TOKEN_KEY&&process.env.CRON_SECRET);}
export function randomState(){return randomBytes(32).toString('base64url');}
export function googleAuthoriseUrl(state:string){
 const {client_id}=creds();
 const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [k,v] of Object.entries({response_type:'code',client_id,redirect_uri:GOOGLE_CALLBACK,scope:SCOPE,access_type:'offline',prompt:'consent select_account',state}))
  u.searchParams.set(k,v);
 return u.toString();
}
async function tokenRequest(form:URLSearchParams,previous?:GoogleTokens):Promise<GoogleTokens>{
 const {client_id,client_secret}=creds();
 form.set('client_id',client_id);form.set('client_secret',client_secret);
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('Google did not authorise this connection. Check the developer application and try again.');
 const value=await r.json() as Record<string,unknown>;
 if(typeof value.access_token!=='string'||!value.access_token)throw new Error('Google did not return an access token.');
 const refresh=typeof value.refresh_token==='string'&&value.refresh_token?value.refresh_token:previous?.refresh_token;
 if(!refresh)throw new Error('Google did not provide offline access. Remove CGP from your Google connected apps and reconnect.');
 const seconds=Number(value.expires_in);
 return {
  access_token:value.access_token,
  refresh_token:refresh,
  expires_at:Date.now()+Math.min(86400,Math.max(60,Number.isFinite(seconds)?seconds:3600))*1000,
  scope:typeof value.scope==='string'?value.scope:previous?.scope||''
 };
}
export function googleExchange(code:string):Promise<GoogleTokens>{
 return tokenRequest(new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:GOOGLE_CALLBACK}));
}
export function googleRefresh(previous:GoogleTokens):Promise<GoogleTokens>{
 return tokenRequest(new URLSearchParams({grant_type:'refresh_token',refresh_token:previous.refresh_token}),previous);
}
export async function googleIdentity(accessToken:string):Promise<string>{
 const r=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Could not verify the Google account.');
 const data=await r.json() as {email?:string;email_verified?:boolean};
 if(data.email_verified!==true||!data.email||!data.email.includes('@'))throw new Error('Google did not provide a verified account address.');
 return data.email.toLowerCase();
}
export function sealCalendarTokens(value:GoogleTokens){return encryptTokens(value);}
export function unsealCalendarTokens(value:string){return decryptTokens(value);}
function validEvent(e:Record<string,unknown>):EventForImport|null{
 if(e.status!=='confirmed'||(e.eventType&&e.eventType!=='default'))return null;
 if(typeof e.id!=='string'||!e.id||e.id.length>512||typeof e.summary!=='string')return null;
 const start=e.start as {dateTime?:unknown}|null,end=e.end as {dateTime?:unknown}|null;
 if(typeof start?.dateTime!=='string'||typeof end?.dateTime!=='string')return null; // all-day events never book sessions
 const a=Date.parse(start.dateTime),b=Date.parse(end.dateTime);
 if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a>4*3600000)return null;
 if(e.summary.trim().length>120)return null;
 return {id:e.id,summary:e.summary.trim(),start:new Date(a).toISOString(),end:new Date(b).toISOString(),status:'confirmed'};
}
export async function googleEvents(token:string,windowStart:Date,windowEnd:Date):Promise<EventForImport[]>{
 const base='https://www.googleapis.com/calendar/v3/calendars/primary/events';
 const results:EventForImport[]=[];
 let page:string|undefined;
 for(let index=0;index<5;index++){
  const u=new URL(base);
  u.searchParams.set('singleEvents','true');
  u.searchParams.set('showDeleted','false');
  u.searchParams.set('orderBy','startTime');
  u.searchParams.set('maxResults','500');
  u.searchParams.set('timeZone','Europe/London');
  u.searchParams.set('timeMin',windowStart.toISOString());
  u.searchParams.set('timeMax',windowEnd.toISOString());
  u.searchParams.set('fields','nextPageToken,items(id,summary,status,eventType,start(dateTime),end(dateTime))');
  if(page)u.searchParams.set('pageToken',page);
  const r=await fetch(u,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(16000)});
  if(r.status===401||r.status===403)throw new Error('Google Calendar authorisation expired or does not have calendar reading permission.');
  if(!r.ok)throw new Error('Google Calendar did not return the requested events.');
  const json=await r.json() as {items?:Record<string,unknown>[];nextPageToken?:string};
  for(const e of json.items||[]){
   const item=validEvent(e);
   if(item&&Date.parse(item.start)>=windowStart.getTime()&&Date.parse(item.start)<windowEnd.getTime())results.push(item);
  }
  if(!json.nextPageToken)return results;
  page=json.nextPageToken;
 }
 throw new Error('Google Calendar returned more than five pages. Sync stopped to avoid cancelling events from an incomplete result.');
}
