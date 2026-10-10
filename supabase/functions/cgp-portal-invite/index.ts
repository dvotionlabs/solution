import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
// This endpoint is authenticated by a 256-bit, expiring, single-use invitation.
// It does not expose the service credential or send emails.
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 try{
  const raw=await req.text();if(raw.length>5000)return response({error:'Request too large'},413);
  const body=JSON.parse(raw);if(!body||!['inspect','register','reset','claim'].includes(body.action)||!(/^[a-f0-9]{64}$/).test(body.token||''))return response({error:'Invalid access link'},400);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:invite,error}=await db.from('cgp_portal_invites').select('id,client_id,expires_at,used_at').eq('token_hash',hash).maybeSingle();
  if(error||!invite||invite.used_at||Date.parse(invite.expires_at)<=Date.now())return response({error:'This access link has expired or has already been used. Ask Chris for a new one.'},400);
  const {data:profile}=await db.from('cgp_profiles').select('id,name,email,active,user_id').eq('id',invite.client_id).single();
  if(!profile?.active)return response({error:'This account is unavailable.'},403);
  if(body.action==='inspect')return response({name:profile.name,email:profile.email,existing:Boolean(profile.user_id)});
  if(body.action==='reset'){
   if(!profile.user_id||typeof body.password!=='string'||body.password.length<12||body.password.length>128)return response({error:'Use a password of 12 to 128 characters.'},400);
   // Recovery is restricted to the exact account already linked to this profile.
   // Consume the capability atomically before changing a password; a replay cannot reset it again.
   const redeemed=await db.rpc('cgp_redeem_portal_invite',{p_token:body.token,p_user:profile.user_id});
   if(redeemed.error)return response({error:'This access link is no longer available.'},400);
   const updated=await db.auth.admin.updateUserById(profile.user_id,{password:body.password});
   if(updated.error)return response({error:'The password could not be updated. Ask Chris for a new access link.'},400);
   return response({ok:true,email:profile.email});
  }
  let userId:string;
  if(body.action==='register'){
   if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)return response({error:'Use a password of 12 to 128 characters.'},400);
   if(profile.user_id)return response({error:'Your account already exists. Sign in to use this access link.'},409);
   const {data,error}=await db.auth.admin.createUser({email:profile.email,password:body.password,email_confirm:true});
   if(error||!data.user)return response({error:'An account may already exist for this email. Sign in to use your access link.'},409);
   userId=data.user.id;
  }else{
   if(typeof body.access_token!=='string')return response({error:'Sign in first.'},401);
   const {data,error}=await db.auth.getUser(body.access_token);
   if(error||!data.user||data.user.email?.toLowerCase()!==profile.email||!data.user.email_confirmed_at)return response({error:'Sign in with the email this link was created for.'},403);
   userId=data.user.id;
  }
  const redeemed=await db.rpc('cgp_redeem_portal_invite',{p_token:body.token,p_user:userId});
  if(redeemed.error)return response({error:'This link could not be activated. Sign in or ask Chris for a new link.'},400);
  return response({ok:true,email:profile.email});
 }catch{return response({error:'Unable to use this access link. Please try again.'},400);}
});
