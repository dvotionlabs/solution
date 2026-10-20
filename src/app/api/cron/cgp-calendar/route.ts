import {timingSafeEqual} from 'node:crypto';
import {synchronizeGoogleCalendar} from '@/lib/portal/calendar-sync';

export const dynamic='force-dynamic';
export const maxDuration=90;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 const bearer=request.headers.get('authorization')||'';
 const expected=secret?'Bearer '+secret:'';
 const a=Buffer.from(bearer),b=Buffer.from(expected);
 if(!secret||a.length!==b.length||!timingSafeEqual(a,b)){
  return new Response(null,{status:401,headers:{'Cache-Control':'no-store'}});
 }
 try{
  const result=await synchronizeGoogleCalendar();
  return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
 }catch{
  // Don't expose private calendar summaries or connection details to the caller.
  return Response.json({ok:false,error:'Calendar synchronisation could not be completed.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
