import { createHmac,timingSafeEqual } from "node:crypto";
export function gcConfig(){
 const token=process.env.GOCARDLESS_ACCESS_TOKEN;
 const environment=process.env.GOCARDLESS_ENVIRONMENT;
 if(!token||!['live','sandbox'].includes(environment||''))return null;
 return {token,base:environment==='live'?'https://api.gocardless.com':'https://api-sandbox.gocardless.com'};
}
export async function gcRequest(path:string,method="GET",body?:unknown,idempotencyKey?:string){
 const config=gcConfig();if(!config)throw new Error("GoCardless is not configured");
 const response=await fetch(`${config.base}${path}`,{method,headers:{Authorization:`Bearer ${config.token}`,"GoCardless-Version":"2015-07-06","Content-Type":"application/json",...(idempotencyKey?{"Idempotency-Key":idempotencyKey}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store",signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok){
  const conflict=result.error?.links?.conflicting_resource_id;
  if(response.status===409&&conflict&&/^\/(billing_requests|billing_request_flows)$/.test(path))return gcRequest(`${path}/${encodeURIComponent(conflict)}`);
  console.error("GoCardless request failed",response.status,result.error?.type,result.error?.request_id);
  throw new Error("GoCardless is temporarily unavailable");
 }
 return result;
}
export function signBillingSession(id:string,secret:string){return `${id}.${createHmac("sha256",secret).update(id).digest("hex")}`;}
export function verifyBillingSession(value:string|undefined,secret:string){
 if(!value)return null;const [id,sig]=value.split(".");if(!/^BRQ[A-Z0-9]+$/.test(id||'')||!/^([a-f0-9]{64})$/.test(sig||''))return null;
 const expected=createHmac("sha256",secret).update(id).digest();return timingSafeEqual(Buffer.from(sig,"hex"),expected)?id:null;
}
