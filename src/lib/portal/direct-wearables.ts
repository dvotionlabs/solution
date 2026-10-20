import {createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual} from 'node:crypto';

export type DirectProvider='WHOOP'|'OURA';
export type DirectTokens={access_token:string;refresh_token:string;expires_at:number;scope:string};
export type OAuthAttempt={state:string;provider:DirectProvider;connection_id:string;profile_id:string;verifier?:string};
export const callbackUrl='https://cgp-dvotion.vercel.app/api/portal/wearables/callback';
export const oauthCookie='cgp_device_oauth';
export const directProviders=['WHOOP','OURA'] as const;

const settings={
 WHOOP:{authorization:'https://api.prod.whoop.com/oauth/oauth2/auth',token:'https://api.prod.whoop.com/oauth/oauth2/token',scope:'offline read:recovery read:sleep read:cycles',clientId:'CGP_WHOOP_CLIENT_ID',clientSecret:'CGP_WHOOP_CLIENT_SECRET'},
 OURA:{authorization:'https://cloud.ouraring.com/oauth/authorize',token:'https://api.ouraring.com/oauth/token',scope:'daily',clientId:'CGP_OURA_CLIENT_ID',clientSecret:'CGP_OURA_CLIENT_SECRET'},
} as const;
export function asDirectProvider(value:unknown):DirectProvider|null{
 return value==='WHOOP'||value==='OURA'?value:null;
}
export function ready(provider:DirectProvider):boolean{
 const config=settings[provider];
 return Boolean(process.env[config.clientId]&&process.env[config.clientSecret]&&process.env.CGP_DIRECT_TOKEN_KEY&&process.env.CGP_WEARABLE_INGEST_KEY);
}
function credentials(provider:DirectProvider){
 const c=settings[provider],client_id=process.env[c.clientId],client_secret=process.env[c.clientSecret];
 if(!client_id||!client_secret||!ready(provider))throw new Error('This provider needs CGP developer approval and secure credentials before connections can begin.');
 return {client_id,client_secret,settings:c};
}
function encryptionKey():Buffer{
 const key=process.env.CGP_DIRECT_TOKEN_KEY;
 if(!key||!/^[a-f0-9]{64}$/i.test(key))throw new Error('Secure wearable token storage is not configured.');
 return Buffer.from(key,'hex');
}
export function encryptTokens(value:DirectTokens):string{
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),nonce);
 const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
 return [nonce,cipher.getAuthTag(),data].map(v=>v.toString('base64url')).join('.');
}
export function decryptTokens(ciphertext:string):DirectTokens{
 const [nonce,auth,encrypted,...extra]=ciphertext.split('.');
 if(!nonce||!auth||!encrypted||extra.length)throw new Error('Invalid encrypted wearable tokens.');
 const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(nonce,'base64url'));
 decipher.setAuthTag(Buffer.from(auth,'base64url'));
 const data=Buffer.concat([decipher.update(Buffer.from(encrypted,'base64url')),decipher.final()]);
 const token=JSON.parse(data.toString('utf8')) as DirectTokens;
 if(!token.access_token||!token.refresh_token||!Number.isFinite(token.expires_at))throw new Error('Stored provider authorisation is invalid.');
 return token;
}
export function newAttempt(provider:DirectProvider,connection_id:string,profile_id:string):OAuthAttempt{
 // WHOOP requires an eight-character state; Oura accepts a longer random value.
 const state=provider==='WHOOP'?randomBytes(6).toString('base64url'):randomBytes(24).toString('base64url');
 const verifier=provider==='OURA'?randomBytes(48).toString('base64url'):undefined;
 return {state,provider,connection_id,profile_id,verifier};
}
export function encodeAttempt(value:OAuthAttempt):string{
 return Buffer.from(JSON.stringify(value),'utf8').toString('base64url');
}
export function decodeAttempt(input:string|undefined):OAuthAttempt|null{
 if(!input||input.length>1200)return null;
 try{
  const data=JSON.parse(Buffer.from(input,'base64url').toString('utf8')) as OAuthAttempt;
  if(!asDirectProvider(data.provider)||typeof data.state!=='string'||data.state.length<8||typeof data.connection_id!=='string'||typeof data.profile_id!=='string')return null;
  return data;
 }catch{return null;}
}
export function stateMatches(received:string|null,expected:string):boolean{
 if(!received)return false;
 const a=Buffer.from(received),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function authorisationUrl(attempt:OAuthAttempt):string{
 const {client_id,settings:c}=credentials(attempt.provider);
 const url=new URL(c.authorization);
 url.searchParams.set('client_id',client_id);
 url.searchParams.set('response_type','code');
 url.searchParams.set('redirect_uri',callbackUrl);
 url.searchParams.set('scope',c.scope);
 url.searchParams.set('state',attempt.state);
 if(attempt.verifier){
  const challenge=createHash('sha256').update(attempt.verifier).digest('base64url');
  url.searchParams.set('code_challenge',challenge);
  url.searchParams.set('code_challenge_method','S256');
 }
 return url.toString();
}
async function getTokenResponse(provider:DirectProvider,params:URLSearchParams):Promise<DirectTokens>{
 const {client_id,client_secret,settings:c}=credentials(provider);
 params.set('client_id',client_id);
 params.set('client_secret',client_secret);
 const res=await fetch(c.token,{method:'POST',body:params,headers:{'Content-Type':'application/x-www-form-urlencoded'},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw new Error('Your wearable provider did not authorise this connection. Please try again.');
 const body=await res.json() as Record<string,unknown>;
 if(typeof body.access_token!=='string'||!body.access_token||typeof body.refresh_token!=='string'||!body.refresh_token)throw new Error('The provider did not return a renewable connection.');
 const expires=typeof body.expires_in==='number'?body.expires_in:Number(body.expires_in);
 return {access_token:body.access_token,refresh_token:body.refresh_token,scope:typeof body.scope==='string'?body.scope:'',expires_at:Date.now()+Math.max(60,Math.min(31*86400,Number.isFinite(expires)?expires:3600))*1000};
}
export function exchangeCode(provider:DirectProvider,code:string,verifier?:string):Promise<DirectTokens>{
 const form=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:callbackUrl});
 if(provider==='OURA'&&verifier)form.set('code_verifier',verifier);
 return getTokenResponse(provider,form);
}
export function refreshTokens(provider:DirectProvider,value:DirectTokens):Promise<DirectTokens>{
 const form=new URLSearchParams({grant_type:'refresh_token',refresh_token:value.refresh_token});
 if(provider==='WHOOP')form.set('scope','offline');
 return getTokenResponse(provider,form);
}
export async function fetchProviderJson(provider:DirectProvider,path:string,token:string):Promise<Record<string,unknown>>{
 const base=provider==='WHOOP'?'https://api.prod.whoop.com/developer/v2/':'https://api.ouraring.com/v2/usercollection/';
 // Only call a fixed set of audited endpoints; the path is internal, never user-provided.
 const url=new URL(path,base);
 if(url.origin!==new URL(base).origin)throw new Error('Unexpected provider URL');
 const res=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(res.status===429)throw new Error('The wearable provider is rate-limiting requests. Please try later.');
 if(res.status===401||res.status===403)throw new Error('Device authorisation expired or a required data permission was declined. Reconnect your device.');
 if(!res.ok)throw new Error('The wearable provider could not return your latest measurements.');
 return (await res.json()) as Record<string,unknown>;
}
export async function revokeWhoop(accessToken:string):Promise<boolean>{
 try{const res=await fetch('https://api.prod.whoop.com/developer/v2/user/access',{method:'DELETE',headers:{Authorization:'Bearer '+accessToken},cache:'no-store',signal:AbortSignal.timeout(12000)});return res.status===204||res.ok;}catch{return false;}
}
