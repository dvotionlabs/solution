import {cookies} from 'next/headers';
import {member,PortalError,reply,fail,jsonBody} from '@/lib/portal/server';
import {googleReady,googleAuthoriseUrl,randomState,CALENDAR_STATE_COOKIE} from '@/lib/portal/google-calendar';
import {sameOrigin} from '@/lib/validation';
import {rateLimited} from '@/lib/rate-limit';
import {idValue,textValue} from '@/lib/portal/model';

export async function GET(){
 try{
  const {db,profile}=await member();
  if(profile.role!=='admin')throw new PortalError('Coach access required.',403);
  const [status,aliases]=await Promise.all([
   db.rpc('cgp_calendar_admin_status'),
   db.from('cgp_calendar_aliases').select('id,client_id,alias').order('alias')
  ]);
  if(status.error||aliases.error)throw new PortalError('Calendar settings could not be loaded.',503);
  return reply({googleReady:googleReady(),...status.data,aliases:aliases.data||[]});
 }catch(e){return fail(e);}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Use the CGP website.'},403);
 if(rateLimited(request,'calendar-admin',30))return reply({error:'Please wait before changing calendar settings again.'},429);
 try{
  const {db,profile}=await member();
  if(profile.role!=='admin')throw new PortalError('Coach access required.',403);
  const b=await jsonBody(request);
  if(b.action==='connect'){
   if(!googleReady())throw new PortalError('Google OAuth credentials are not configured yet. Set them up in the CGP Vercel project.',503);
   const state=randomState();
   const jar=await cookies();
   jar.set(CALENDAR_STATE_COOKIE,state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',
    path:'/api/admin/calendar/callback',maxAge:600});
   return reply({url:googleAuthoriseUrl(state)});
  }
  if(b.action==='alias-add'){
   const alias=textValue(b.alias,2,80),clientId=idValue(b.client_id);
   const result=await db.from('cgp_calendar_aliases').insert({alias,client_id:clientId}).select('id').single();
   if(result.error)throw new PortalError(result.error.code==='23505'?'That exact calendar title is already assigned to a client.':'Calendar name could not be added.',400);
   return reply({ok:true,id:result.data.id});
  }
  if(b.action==='alias-delete'){
   const id=idValue(b.id);
   const result=await db.from('cgp_calendar_aliases').delete().eq('id',id);
   if(result.error)throw new Error('Calendar name could not be removed.');
   return reply({ok:true});
  }
  if(b.action==='disconnect'){
   const r=await db.rpc('cgp_calendar_admin_disconnect');
   if(r.error)throw new Error('Could not disconnect Google Calendar.');
   return reply({ok:true,message:'Google Calendar disconnected. Existing CGP appointments are unchanged.'});
  }
  throw new PortalError('Unsupported calendar action.',400);
 }catch(e){return fail(e);}
}
