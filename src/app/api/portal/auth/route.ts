import {cookies} from 'next/headers';
import {authenticated,clearSession,fail,invitationRequest,jsonBody,portalDb,reply,saveSession} from '@/lib/portal/server';
import {sameOrigin} from '@/lib/validation';
import {rateLimited} from '@/lib/rate-limit';
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Please use the CGP website.'},403);
 if(rateLimited(request,'portal-auth',30))return reply({error:'Please wait a few minutes before trying again.'},429);
 try{
  const b=await jsonBody(request);const db=portalDb();
  if(b.action==='logout'){try{const ctx=await authenticated();await db.auth.setSession({access_token:ctx.token,refresh_token:(await cookies()).get('cgp_refresh')?.value||''});await db.auth.signOut({scope:'local'});}catch{}await clearSession();return reply({ok:true});}
  if(b.action==='invite-info'){return reply(await invitationRequest({action:'inspect',token:b.invite}));}
  if(b.action==='register'||b.action==='reset'){
   if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)throw new Error('Choose a password with 12 to 128 characters.');
   const data=await invitationRequest({action:b.action,token:b.invite,password:b.password});
   const login=await db.auth.signInWithPassword({email:data.email,password:b.password});
   if(login.error||!login.data.session)throw new Error('Your account is ready. Please sign in with your email and password.');
   await saveSession(login.data.session);return reply({ok:true});
  }
  if(b.action==='login'){
   if(typeof b.email!=='string'||typeof b.password!=='string'||b.email.length>254||b.password.length>128)throw new Error('Check your email and password.');
   const r=await db.auth.signInWithPassword({email:b.email.trim().toLowerCase(),password:b.password});
   if(r.error||!r.data.session)throw new Error('Email or password is incorrect. Please try again.');
   if(typeof b.invite==='string'&&b.invite)await invitationRequest({action:'claim',token:b.invite,access_token:r.data.session.access_token});
   await saveSession(r.data.session);return reply({ok:true});
  }
  if(b.action==='password'){
   const ctx=await authenticated();if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)throw new Error('Use 12 to 128 characters.');
   const r=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,{method:'PUT',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,Authorization:`Bearer ${ctx.token}`,'Content-Type':'application/json'},body:JSON.stringify({password:b.password}),cache:'no-store'});
   if(!r.ok)throw new Error('Your password could not be updated. Please sign in again.');return reply({ok:true});
  }
  throw new Error('Unknown action.');
 }catch(error){return fail(error);}
}
