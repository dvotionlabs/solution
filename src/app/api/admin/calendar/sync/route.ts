import {member,PortalError,reply,fail} from '@/lib/portal/server';
import {sameOrigin} from '@/lib/validation';
import {rateLimited} from '@/lib/rate-limit';
import {synchronizeGoogleCalendar} from '@/lib/portal/calendar-sync';

export const maxDuration=90;
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Use the CGP website.'},403);
 if(rateLimited(request,'calendar-manual-sync',8))return reply({error:'Please wait before syncing again.'},429);
 try{
  const {profile}=await member();
  if(profile.role!=='admin')throw new PortalError('Coach access required.',403);
  return reply({ok:true,...await synchronizeGoogleCalendar()});
 }catch(e){return fail(e);}
}
