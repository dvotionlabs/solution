import {normaliseTerra,verifyTerra} from '@/lib/portal/wearables';
export async function POST(request:Request){
 const secret=process.env.TERRA_SIGNING_SECRET,key=process.env.CGP_WEARABLE_INGEST_KEY;
 if(!secret||!key)return Response.json({error:'Integration not configured'},{status:503});
 if(Number(request.headers.get('content-length'))>2000000)return new Response(null,{status:413});
 const body=await request.text();if(Buffer.byteLength(body)>2000000)return new Response(null,{status:413});
 if(!verifyTerra(body,request.headers.get('terra-signature'),secret))return Response.json({error:'Invalid signature'},{status:401});
 try{const event=normaliseTerra(JSON.parse(body));if(!event)return Response.json({ok:true});
  const r=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/cgp_ingest_wearable`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,'Content-Type':'application/json'},body:JSON.stringify({p_key:key,p_event:event}),cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!r.ok)return Response.json({error:'Please retry delivery'},{status:503});return Response.json({ok:true});
 }catch{return Response.json({error:'Could not process payload'},{status:400});}
}
