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

`/referrals` is the page clients can share. A current client receives **50% off one month of their current coaching plan** when a new person they refer signs up to a monthly Direct Debit plan. The first appointment is free for everyone. A consultation alone or a pack purchase does not trigger the referral reward.

Enquiries have an optional referring-client name, validated server-side and prefixed to the existing private `cgp_enquiries.message` field. Monthly checkout captures the name in GoCardless `mandate_request.metadata.referred_by`; the three existing Billing Request metadata keys and agreed amount validation are preserved. Leaving the name blank on a resumed setup preserves its original referral. Conflicting referral names on an existing setup require Chris to correct them rather than silently overwriting attribution.

After the signed fulfilled event creates or finds the agreed subscription, `cgp_payment_events.payload.cgp_referral` records the referring name, plan, subscription ID, billing-request ID and the 50% / one-month offer with `status: needs_review`. This is a claim to verify, not an automatically granted reward. No extra database permissions or client billing changes are introduced.

Chris checks the referred person has joined and that the referrer is a current client, then arranges a single discounted month on the referrer’s existing coaching plan through its current billing provider. Keep a record of the applied discount keyed to the referred subscription so retries or duplicate names do not result in multiple awards. Existing Wix clients remain managed through their existing billing setup. No discount is automatically applied or announced to a client by this site.

For manual review, query `cgp_enquiries` for messages starting `Referred by:` and `cgp_payment_events` for non-null `payload->'cgp_referral'`. Consultation referrals can be matched manually if the client does not repeat the name during checkout. The public access and GoCardless launch steps below are still required before live checkout can qualify referrals.

## Configuration

Production sensitive environment variables:
- `GOCARDLESS_ACCESS_TOKEN` with `GOCARDLESS_ENVIRONMENT=live`.
- `GOCARDLESS_WEBHOOK_SECRET`: owner must copy from the GoCardless webhook endpoint below. Until configured, new monthly checkout is disabled with a consultation alternative.
- `STRIPE_WEBHOOK_SECRET`: provisioned for CGP's new pack-payment endpoint.
- `PAYMENT_EVENTS_INGEST_KEY`: dedicated write-only database capability, provisioned separately. Only its SHA256 hash is stored in the private database schema. It cannot read tables or execute arbitrary SQL.

Public Supabase variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Never put secrets in Git or chat. Use Sensitive Production environment variables in Vercel. Test using separate sandbox credentials; never copy live credentials to Preview.

### Required launch steps

1. The inherited Vercel Authentication protection must be removed with explicit owner approval before customers or payment providers can access the temporary domain. Automatic approval review previously rejected that change without explicit approval. It has not been retried.
2. In GoCardless Developers > Webhooks, create the HTTPS endpoint `https://cgp-dvotion.vercel.app/api/webhooks/gocardless`, copy its signing secret into `GOCARDLESS_WEBHOOK_SECRET` in Vercel Production and redeploy. Enable payment, mandate, subscription and billing-request events if event selection is offered.
3. Verify delivery of a GoCardless dashboard test webhook, and complete a sandbox mandate/subscription journey before sending live links to clients. No real client mandates or charges were used for automated testing.

Stripe endpoint `we_1UOkNu2MuOMFBF7sbmGGRCmg` is registered at `https://cgp-dvotion.vercel.app/api/webhooks/stripe` for checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed. It also needs public reachability. Stripe Payment Links are live, fixed at one pack each; no customer was charged during setup.

## Billing behaviour

For UK Bacs, subscription_request inside a Billing Request is not supported (ACH/PAD only). The site creates a mandate Billing Request with trusted plan/amount metadata. The signed `billing_requests.fulfilled` webhook retrieves its current state and creates a monthly subscription against the authorised mandate. GoCardless chooses the first available collection date, then collects monthly until cancelled.

Replay safety: existing subscriptions are matched by billing-request ID, including cancelled ones; creation also uses a stable idempotency key. The return page only reads provider state and never creates a subscription or declares money collected. If the customer never returns, the webhook still starts the authorised subscription. Failed processing returns a non-2xx response so GoCardless retries. Monitor delivery failures in the provider dashboard.

`/direct-debit` retains the original existing-client mandate-only flow. Chris must arrange those agreed legacy subscriptions manually; it does not choose a public price or migrate an existing Wix plan.

Stripe packs use hosted Payment Links; bank/card details never enter this app. Signed Stripe webhooks validate the exact plan, payment link, currency and amount. An unpaid completed Checkout Session remains pending; only confirmed paid sessions become paid orders. This app does not automatically grant sessions or book dates. Chris fulfils coaching manually after verifying the paid order. Refunds, cancellations and exceptional disputes are managed in Stripe/GoCardless dashboards, which remain the billing source of truth.

## Operational records and security

- `public.cgp_enquiries`: consultation requests. No enquiry notification emails are currently sent; review this table or use direct email links.
- `public.cgp_pack_orders`: paid, pending and failed pack orders, with customer contact details.
- `public.cgp_payment_events`: deduplicated provider events. GoCardless status updates are an event history, not a computed account balance.

RLS is enabled. Public users cannot read, insert into, change or delete payment tables directly. The scoped ingestion function requires an unguessable server-only credential; writes are transactional. Paid orders cannot regress to pending because of replay or event ordering.

Enquiry input is bounded, consent is required, and a honeypot plus per-email/day uniqueness and best-effort instance-level rate limits reduce spam. These are not distributed anti-bot controls. Direct Debit setup requires same-origin requests and a signed HttpOnly session cookie.

## Development and verification

`npm ci`, `npm test`, `npm run build`. Checks cover price totals, consent/input validation, forged cookies/signatures, monthly-versus-pack separation, delayed payment state, and cancelled-subscription replay. Database transaction checks cover out-of-order events; anonymous table privileges are verified. Live visual and end-to-end payment testing remain limited by deployment protection and missing GoCardless webhook setup.

The temporary domain is noindex. Update canonical metadata when the permanent domain is chosen. Photographs are from the owner's DVOTION website.
