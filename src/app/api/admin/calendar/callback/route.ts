import {cookies} from 'next/headers';
import {member} from '@/lib/portal/server';
import {CALENDAR_STATE_COOKIE,equalState,googleExchange,googleIdentity,sealCalendarTokens} from '@/lib/portal/google-calendar';
import {synchronizeGoogleCalendar} from '@/lib/portal/calendar-sync';

export const maxDuration=60;
function finish(result:string){
 return Response.redirect('https://cgp-dvotion.vercel.app/admin?tab=settings&calendar='+encodeURIComponent(result),303);
}
export async function GET(request:Request){
 const jar=await cookies();
 const expected=jar.get(CALENDAR_STATE_COOKIE)?.value||null;
 jar.set(CALENDAR_STATE_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',
  sameSite:'lax',path:'/api/admin/calendar/callback',maxAge:0});
 const params=new URL(request.url).searchParams;
 if(!equalState(params.get('state'),expected))return finish('expired');
 if(params.has('error'))return finish('declined');
 const code=params.get('code');
 if(!code||code.length>3000)return finish('failed');
 try{
  const {db,profile}=await member();
  if(profile.role!=='admin')return finish('unauthorised');
  const tokens=await googleExchange(code);
  const email=await googleIdentity(tokens.access_token);
  const saved=await db.rpc('cgp_calendar_admin_connect',{p_tokens:sealCalendarTokens(tokens),p_email:email});
  if(saved.error)throw new Error(saved.error.message||'Could not save the Google authorisation.');
  // Run the initial import immediately. If Google is temporarily down, scheduled
  // sync and the manual 'Sync now' button can retry without repeating OAuth.
  try{await synchronizeGoogleCalendar();}catch{return finish('connected-needs-sync');}
  return finish('connected');
 }catch{return finish('failed');}
}
