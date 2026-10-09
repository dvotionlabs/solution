import {cookies} from "next/headers";
import {gcConfig,gcRequest,verifyBillingSession} from "@/lib/gocardless";
export const dynamic='force-dynamic';
export default async function Complete(){
 const config=gcConfig();const cookie=(await cookies()).get('cgp_billing')?.value;const id=config?verifyBillingSession(cookie,config.token):null;
 let confirmed=false;
 if(id)try{const data=await gcRequest(`/billing_requests/${id}`);confirmed=data.billing_requests?.status==='fulfilled';}catch{}
 return <section className="simple-page"><p className="eyebrow">CG PERFORMANCE / CLIENT PAYMENTS</p><h1>{confirmed?<>Your setup<br/>is complete.</>:<>Let’s confirm<br/>your setup.</>}</h1><p>{confirmed?'Your Direct Debit mandate has been authorised. Chris can now arrange the coaching subscription you have agreed. GoCardless will notify you of scheduled collections.':'We haven’t confirmed a completed mandate in this session. If you finished the GoCardless form, contact Chris before starting again so he can check its status.'}</p><p>Setting up a mandate does not mean a payment has been collected.</p><a className="text-link" href="mailto:chrisgkoufas.performance@gmail.com?subject=Direct%20Debit%20setup">Contact Chris ↗</a><p className="payment-note"><a href="/">Back to CG Performance</a></p></section>;
}
