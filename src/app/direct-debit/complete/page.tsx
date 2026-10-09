import {cookies} from 'next/headers';
import {gcConfig,gcRequest,verifyBillingSession,type BillingRequest} from '@/lib/gocardless';
import {money} from '@/lib/pricing';
import {getPaymentPlan} from '@/lib/client-pricing';
export const dynamic='force-dynamic';
export default async function Complete(){
 const config=gcConfig(),cookie=(await cookies()).get('cgp_billing')?.value,id=config?verifyBillingSession(cookie,config.token):null;
 let billing:BillingRequest|undefined,subscription:{status:string;amount:number;start_date?:string}|undefined;
 if(id)try{
  const data=await gcRequest(`/billing_requests/${id}`);billing=data.billing_requests;
  const mandate=billing?.mandate_request?.links?.mandate;
  if(billing?.status==='fulfilled'&&billing.metadata?.plan_id&&mandate){const list=await gcRequest(`/subscriptions?mandate=${encodeURIComponent(mandate)}&limit=100`);subscription=list.subscriptions?.find((s:{metadata?:Record<string,string>})=>s.metadata?.billing_request===id);}
 }catch{}
 const plan=getPaymentPlan(billing?.metadata?.plan_id),confirmed=billing?.status==='fulfilled';
 const active=subscription&&['active','pending_customer_approval'].includes(subscription.status);
 const title=active?'Your plan is set up.':confirmed&&!plan?'Your mandate is set up.':'Let’s confirm your setup.';
 const message=active&&subscription?`${plan?.label ?? 'Your coaching plan'} is set up at ${money(subscription.amount)} per month. GoCardless will email you the collection dates. Chris will be in touch to arrange your coaching.`:confirmed&&plan?'Your Direct Debit mandate has been authorised. We are confirming your monthly subscription. Please refresh this page in a moment. If it is still pending, contact Chris before starting again.':confirmed?'Your Direct Debit mandate has been authorised. Chris will arrange the coaching subscription you have agreed.':'We have not confirmed a completed setup in this session. If you finished the GoCardless form, contact Chris before starting again so he can check its status.';
 return <section className="simple-page"><p className="eyebrow">CG PERFORMANCE / CLIENT PAYMENTS</p><h1>{title}</h1><p>{message}</p>{subscription?.start_date&&active&&<p>First scheduled collection: {new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${subscription.start_date}T12:00:00Z`))}.</p>}<p>Setup confirmation does not mean a payment has already been collected.</p>{plan&&!active&&<p><a href="/direct-debit/complete">Refresh status</a></p>}<a className="text-link" href="mailto:chrisgkoufas.performance@gmail.com?subject=Direct%20Debit%20setup">Contact Chris ↗</a><p className="payment-note"><a href="/">Back to CG Performance</a></p></section>;
}
