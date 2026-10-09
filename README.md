# CG Performance

Coaching website for Chris Gkoufas. Next.js on Vercel, GitHub source, Supabase enquiries and payment records, GoCardless monthly Direct Debits, Stripe prepaid packs.

## Infrastructure

- Vercel `cgp`, project `prj_GJm5z6tZy0CSsLmnGNGsyQluUUEI`, temporary URL https://cgp-dvotion.vercel.app
- GitHub `dvotionlabs/solution`, with the previous application preserved in history.
- Supabase `algwytnelmnjhkmonxro`, London. The reused project is still named `solution` in Supabase.
- Stripe CGP `acct_1RXOue2MuOMFBF7s`, displayed as `cgperformance.fit`. DVOTION is a separate account and is not used here.
- Existing Wix/Stripe subscriptions are unchanged. Starting a new GoCardless subscription does not cancel an old subscription.

## Pricing

`src/lib/pricing.ts` is the GBP-pence catalogue. Monthly amounts: in person £460 / £880 / £1,260 for 4 / 8 / 12 sessions; virtual £420 / £800 / £1,140. Online programming £165/month. Packs: in person £1,150 / £2,200; virtual £1,050 / £2,000 for 10 / 20 sessions. The first appointment is free: goals, training experience, lifestyle and limitations.

Routes `/coaching/in-person`, `/coaching/virtual`, `/coaching/online` show prices and checkout buttons. `/checkout/[plan]` discloses the full recurring amount and obtains consent before bank authorisation.

## Referrals and first appointments

`/referrals` is the page clients can share. It includes a coaching format selector with direct monthly checkout and Stripe pack purchase buttons, alongside the optional free consultation form. Homepage and coaching-page calls to action also offer paid plans without requiring a consultation enquiry first. A current client receives **50% off one month of their current coaching plan** when a new person they refer signs up to a monthly Direct Debit plan. The first appointment is free for everyone. A consultation alone or a pack purchase does not trigger the referral reward.

Enquiries have an optional referring-client name, validated server-side and prefixed to the existing private `cgp_enquiries.message` field. Monthly checkout captures the name in GoCardless `mandate_request.metadata.referred_by`; the three existing Billing Request metadata keys and agreed amount validation are preserved. Leaving the name blank on a resumed setup preserves its original referral. Conflicting referral names on an existing setup require Chris to correct them rather than silently overwriting attribution.

After the signed fulfilled event creates or finds the agreed subscription, `cgp_payment_events.payload.cgp_referral` records the referring name, plan, subscription ID, billing-request ID and the 50% / one-month offer with `status: needs_review`. This is a claim to verify, not an automatically granted reward. No extra database permissions or client billing changes are introduced.

Chris checks the referred person has joined and that the referrer is a current client, then arranges a single discounted month on the referrer’s existing coaching plan through its current billing provider. Keep a record of the applied discount keyed to the referred subscription so retries or duplicate names do not result in multiple awards. Existing Wix clients remain managed through their existing billing setup. No discount is automatically applied or announced to a client by this site.

For manual review, query `cgp_enquiries` for messages starting `Referred by:` and `cgp_payment_events` for non-null `payload->'cgp_referral'`. Consultation referrals can be matched manually if the client does not repeat the name during checkout. Public access and the live GoCardless webhook are configured; referral qualification is recorded after an authorised monthly subscription is created.

## Configuration

Production sensitive environment variables:
- `GOCARDLESS_ACCESS_TOKEN` with `GOCARDLESS_ENVIRONMENT=live`.
- `GOCARDLESS_WEBHOOK_SECRET`: provisioned as a production Secret for enabled webhook `WE00002BZN2WK3`.
- `STRIPE_WEBHOOK_SECRET`: provisioned for CGP's new pack-payment endpoint.
- `PAYMENT_EVENTS_INGEST_KEY`: dedicated write-only database capability, provisioned separately. Only its SHA256 hash is stored in the private database schema. It cannot read tables or execute arbitrary SQL.

Public Supabase variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Never put secrets in Git or chat. Use Sensitive Production environment variables in Vercel. Test using separate sandbox credentials; never copy live credentials to Preview.

### Launch status and verification

1. Vercel Authentication protection was removed on 9 October 2026 with the owner’s explicit approval. The temporary domain is publicly reachable by clients and payment providers.
2. GoCardless endpoint `WE00002BZN2WK3` (CGP website payments) was created and enabled in CG Performance Limited on 9 October 2026. It delivers to `https://cgp-dvotion.vercel.app/api/webhooks/gocardless`. The signing secret is stored in Vercel Production and deployed.
3. Verified public checkout shows Continue to GoCardless; a signed empty webhook returns HTTP 204; an incomplete live checkout opens the CG Performance Limited customer-details form. Real `billing_requests.created` and `billing_requests.flow_created` webhooks were received and saved in Supabase. No customer details, bank mandate or payment were authorised. Full bank authorisation and collection were not exercised; subscription creation/replay logic is covered by automated tests.

Stripe endpoint `we_1UOkNu2MuOMFBF7sbmGGRCmg` is registered at `https://cgp-dvotion.vercel.app/api/webhooks/stripe` for checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed. It is publicly reachable. Stripe Payment Links are live, fixed at one pack each; the in-person 10-pack checkout was verified at GBP 1,150 in CGP account `acct_1RXOue2MuOMFBF7s`. Stripe may offer a converted local currency through Adaptive Pricing. No customer was charged during setup.

## Billing behaviour

For UK Bacs, subscription_request inside a Billing Request is not supported (ACH/PAD only). The site creates a mandate Billing Request with trusted plan/amount metadata. The signed `billing_requests.fulfilled` webhook retrieves its current state and creates a monthly subscription against the authorised mandate. GoCardless chooses the first available collection date, then collects monthly until cancelled.

Replay safety: existing subscriptions are matched by billing-request ID, including cancelled ones; creation also uses a stable idempotency key. The return page only reads provider state and never creates a subscription or declares money collected. If the customer never returns, the webhook still starts the authorised subscription. Failed processing returns a non-2xx response so GoCardless retries. Monitor delivery failures in the provider dashboard.

`/direct-debit` retains the original existing-client mandate-only flow. Chris must arrange those agreed legacy subscriptions manually; it does not choose a public price or migrate an existing Wix plan.

Stripe packs use hosted Payment Links; bank/card details never enter this app. Signed Stripe webhooks validate the exact plan, payment link, currency and amount. An unpaid completed Checkout Session remains pending; only confirmed paid sessions become paid orders. This app does not automatically grant sessions or book dates. Chris fulfils coaching manually after verifying the paid order. Refunds, cancellations and exceptional disputes are managed in Stripe/GoCardless dashboards, which remain the billing source of truth.

## Operational records and security

### Existing-client prices

`/client-pricing` accepts reusable client codes and displays the matching plan and exact total. Codes are not Stripe promotion codes: apply them on CGP before payment. Private code mappings live only in the Sensitive Production `CGP_CLIENT_PLANS` JSON variable, with `id`, `code`, `basePlanId`, `amount` (GBP pence), and, for packs, `paymentUrl` and `paymentLinkId`. Never put real codes or client pricing records in source control or public bundles.

New rates can be previewed now; checkout is gated server-side until 00:00 Europe/London on 1 December 2026. Pack links are withheld until then. Monthly codes require the matching code and plan ID and create a recurring subscription at the validated agreed amount. Pack codes lead to reusable, fixed-quantity Stripe Payment Links, and webhooks verify the exact private plan, amount and link. Codes provide access to an agreed rate, not identity verification.

Keep configured plan entries and provider IDs immutable for delayed webhook handling. For later price changes, add new versioned IDs and migrate deliberately. Existing Wix subscriptions are not changed or cancelled by these codes; agree the changeover before starting a new DD to avoid overlapping payments.

- `public.cgp_enquiries`: consultation requests. No enquiry notification emails are currently sent; review this table or use direct email links.
- `public.cgp_pack_orders`: paid, pending and failed pack orders, with customer contact details.
- `public.cgp_payment_events`: deduplicated provider events. GoCardless status updates are an event history, not a computed account balance.

RLS is enabled. Public users cannot read, insert into, change or delete payment tables directly. The scoped ingestion function requires an unguessable server-only credential; writes are transactional. Paid orders cannot regress to pending because of replay or event ordering.

Enquiry input is bounded, consent is required, and a honeypot plus per-email/day uniqueness and best-effort instance-level rate limits reduce spam. These are not distributed anti-bot controls. Direct Debit setup requires same-origin requests and a signed HttpOnly session cookie.

## Development and verification

`npm ci`, `npm test`, `npm run build`. Checks cover price totals, consent/input validation, forged cookies/signatures, monthly-versus-pack separation, delayed payment state, and cancelled-subscription replay. Database transaction checks cover out-of-order events; anonymous table privileges are verified. Live browser checks now cover public referral-page format switching, the GoCardless authorisation handoff and Stripe pack checkout. Production webhooks are verified through stored provider events. Tests stop before authorising a real bank mandate or payment.

The temporary domain is noindex. Update canonical metadata when the permanent domain is chosen. Photographs are from the owner's DVOTION website.
