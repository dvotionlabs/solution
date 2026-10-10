import 'server-only';
import {createClient,type Session} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import type {Profile} from './model';
export function portalDb(token?:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('The portal is temporarily unavailable.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:token?{headers:{Authorization:`Bearer ${token}`}}:undefined});
}
const cookieNames=['cgp_access','cgp_refresh'] as const;
export async function saveSession(session:Session){
 const jar=await cookies();const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7};
 jar.set(cookieNames[0],session.access_token,{...options,maxAge:session.expires_in});jar.set(cookieNames[1],session.refresh_token,options);
}
export async function clearSession(){const jar=await cookies();for(const name of cookieNames)jar.set(name,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});}
export async function authenticated(){
 const jar=await cookies();let token=jar.get('cgp_access')?.value;const refresh=jar.get('cgp_refresh')?.value;
 let result=token?await portalDb().auth.getUser(token):null;
 if((!result?.data.user||result.error)&&refresh){const r=await portalDb().auth.refreshSession({refresh_token:refresh});if(r.data.session&&!r.error){await saveSession(r.data.session);token=r.data.session.access_token;result=await portalDb().auth.getUser(token);}}
 if(!token||!result?.data.user||result.error)throw new PortalError('Please sign in to continue.',401);
 const db=portalDb(token);const {data:profile,error}=await db.from('cgp_profiles').select('*').eq('user_id',result.data.user.id).eq('active',true).maybeSingle();
 if(error)throw new PortalError('Your portal could not be loaded. Please try again.',503);
 return {db,user:result.data.user,token,profile:profile as Profile|null};
}
export class PortalError extends Error{constructor(message:string,public status=400){super(message);}}
export async function member(){const ctx=await authenticated();if(!ctx.profile)throw new PortalError('Ask Chris for your private portal access link.',403);return {...ctx,profile:ctx.profile};}
export const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie'};
export function reply(value:unknown,status=200){return Response.json(value,{status,headers:privateHeaders});}
export function fail(error:unknown){return reply({error:error instanceof Error?error.message:'Something went wrong. Please try again.'},error instanceof PortalError?error.status:400);}
export async function jsonBody(request:Request){if(!request.headers.get('content-type')?.includes('application/json'))throw new PortalError('Use a JSON request.',415);const raw=await request.text();if(raw.length>30000)throw new PortalError('This request is too large.',413);const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('Invalid request.');return b as Record<string,unknown>;}
export async function invitationRequest(body:Record<string,unknown>){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const response=await fetch(`${url}/functions/v1/cgp-portal-invite`,{method:'POST',headers:{apikey:key!,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(!response.ok)throw new PortalError(data.error||'Your access link could not be used.',response.status);return data;
}
export function wearablesReady(){return Boolean(process.env.TERRA_API_KEY&&process.env.TERRA_DEV_ID&&process.env.TERRA_SIGNING_SECRET&&process.env.CGP_WEARABLE_INGEST_KEY);}
