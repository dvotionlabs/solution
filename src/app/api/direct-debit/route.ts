import {NextRequest,NextResponse} from "next/server";
import {gcConfig,gcRequest,signBillingSession,verifyBillingSession,subscriptionCheckoutReady} from "@/lib/gocardless";
import {getPlan} from '@/lib/pricing';
import {sameOrigin} from "@/lib/validation";
import {rateLimited} from "@/lib/rate-limit";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Please use the CG Performance payment page.'},{status:403});
 if(rateLimited(request,'direct-debit',5))return NextResponse.json({error:'Please wait a few minutes before trying again.'},{status:429});
 const config=gcConfig();if(!config)return NextResponse.json({error:'Online setup will be available shortly. Please contact Chris.'},{status:503});
 try{
  const raw=await request.text();if(raw.length>500)return NextResponse.json({error:'Invalid request.'},{status:400});const body=JSON.parse(raw);
  if(body?.consent!==true||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.requestId||''))return NextResponse.json({error:'Please confirm your coaching and payment agreement.'},{status:400});
  const plan=getPlan(body.planId);
  if(body.planId!==undefined&&(!plan||plan.kind!=='monthly'))return NextResponse.json({error:'Please choose a valid monthly coaching plan.'},{status:400});
  if(plan&&!subscriptionCheckoutReady())return NextResponse.json({error:'Direct Debit checkout is being connected. Please contact Chris.'},{status:503});
  let id=verifyBillingSession(request.cookies.get('cgp_billing')?.value,config.token);
  if(id){const existing=await gcRequest(`/billing_requests/${id}`);if(existing.billing_requests?.status==='fulfilled')return NextResponse.json({url:'/direct-debit/complete'});if(existing.billing_requests?.status!=='pending')id=null;else if(existing.billing_requests.metadata?.plan_id!==plan?.id)return NextResponse.json({error:'You have already started another Direct Debit setup. Please contact Chris before changing plans so we can avoid duplicate payments.'},{status:409});}
  if(!id){const metadata=plan?{source:'cgp-website',plan_id:plan.id,amount:String(plan.amount)}:{source:'cgp-website'};const result=await gcRequest('/billing_requests','POST',{billing_requests:{mandate_request:{currency:'GBP',scheme:'bacs'},metadata}},`cgp-${plan?.id||'mandate'}-${body.requestId}`);id=result.billing_requests?.id;}
  if(!id||!/^BRQ[A-Z0-9]+$/.test(id))throw new Error('Invalid billing request');
  const origin=new URL(request.url).origin;
  const flow=await gcRequest('/billing_request_flows','POST',{billing_request_flows:{links:{billing_request:id},redirect_uri:`${origin}/direct-debit/complete`,exit_uri:`${origin}${plan?`/checkout/${plan.id}`:'/direct-debit'}`,auto_fulfil:true}},`cgp-flow-${plan?.id||'mandate'}-${body.requestId}`);
  const url=flow.billing_request_flows?.authorisation_url;const host=new URL(url).hostname;
  if(!['pay.gocardless.com','pay-sandbox.gocardless.com'].includes(host)||new URL(url).protocol!=='https:')throw new Error('Invalid payment URL');
  const response=NextResponse.json({url});response.cookies.set('cgp_billing',signBillingSession(id,config.token),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:86400});
  return response;
 }catch{return NextResponse.json({error:'We couldn’t open secure Direct Debit setup. Please try again or contact Chris.'},{status:502});}
}
