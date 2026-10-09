import {NextRequest,NextResponse} from "next/server";
import {gcConfig,gcRequest,signBillingSession,verifyBillingSession} from "@/lib/gocardless";
import {sameOrigin} from "@/lib/validation";
import {rateLimited} from "@/lib/rate-limit";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Please use the CG Performance payment page.'},{status:403});
 if(rateLimited(request,'direct-debit',5))return NextResponse.json({error:'Please wait a few minutes before trying again.'},{status:429});
 const config=gcConfig();if(!config)return NextResponse.json({error:'Online setup will be available shortly. Please contact Chris.'},{status:503});
 try{
  const raw=await request.text();if(raw.length>500)return NextResponse.json({error:'Invalid request.'},{status:400});const body=JSON.parse(raw);
  if(body?.consent!==true||!/^[a-f0-9-]{36}$/i.test(body.requestId||''))return NextResponse.json({error:'Please confirm you have agreed your coaching with Chris.'},{status:400});
  let id=verifyBillingSession(request.cookies.get('cgp_billing')?.value,config.token);
  if(id){const existing=await gcRequest(`/billing_requests/${id}`);if(existing.billing_requests?.status==='fulfilled')return NextResponse.json({url:'/direct-debit/complete'});if(existing.billing_requests?.status!=='pending')id=null;}
  if(!id){const result=await gcRequest('/billing_requests','POST',{billing_requests:{mandate_request:{currency:'GBP',scheme:'bacs'},metadata:{source:'cgp-website'}}},`cgp-mandate-${body.requestId}`);id=result.billing_requests?.id;}
  if(!id||!/^BRQ[A-Z0-9]+$/.test(id))throw new Error('Invalid billing request');
  const origin=new URL(request.url).origin;
  const flow=await gcRequest('/billing_request_flows','POST',{billing_request_flows:{links:{billing_request:id},redirect_uri:`${origin}/direct-debit/complete`,exit_uri:`${origin}/direct-debit`,auto_fulfil:true}},`cgp-flow-${body.requestId}`);
  const url=flow.billing_request_flows?.authorisation_url;const host=new URL(url).hostname;
  if(!['pay.gocardless.com','pay-sandbox.gocardless.com'].includes(host)||new URL(url).protocol!=='https:')throw new Error('Invalid payment URL');
  const response=NextResponse.json({url});response.cookies.set('cgp_billing',signBillingSession(id,config.token),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:86400});
  return response;
 }catch{return NextResponse.json({error:'We couldn’t open secure Direct Debit setup. Please try again or contact Chris.'},{status:502});}
}
