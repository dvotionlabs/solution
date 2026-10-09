import { createHash } from "node:crypto";
// Best-effort instance-level abuse protection. DB constraints provide a second limit for enquiries.
const buckets=new Map<string,{count:number;until:number}>();
export function rateLimited(request:Request,scope:string,limit:number){
 const now=Date.now();
 for(const [key,value] of buckets) if(value.until<now)buckets.delete(key);
 if(buckets.size>10000)return true;
 const ip=request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-forwarded-for")?.split(",")[0]||"local";
 const key=createHash("sha256").update(`${scope}:${ip}`).digest("hex");
 const item=buckets.get(key)||{count:0,until:now+15*60*1000};item.count++;buckets.set(key,item);return item.count>limit;
}
