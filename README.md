# CG Performance

Simple coaching website for Chris Gkoufas. Next.js 16.3.8 on Vercel, GitHub source, Supabase enquiry storage, GoCardless-hosted Direct Debit mandate setup.

## Infrastructure

- Vercel: `cgp`, renamed from `solution`, project ID `prj_GJm5z6tZy0CSsLmnGNGsyQluUUEI`.
- GitHub: `dvotionlabs/solution`. Git history preserves the previous application.
- Supabase: `algwytnelmnjhkmonxro`, the existing `solution` project in London, reused for CGP.
- Enquiries: Supabase Table Editor, `public.cgp_enquiries`. Enquiries are stored here; email notifications are not part of this version. Direct email links are also provided.

## Environment variables

Configured in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GOCARDLESS_ENVIRONMENT`: `live` in Production. Use `sandbox` with a sandbox token for testing.

Owner supplies:
- `GOCARDLESS_ACCESS_TOKEN`: server-side GoCardless API access token with read/write access. Mark Sensitive, Production only. Never prefix with `NEXT_PUBLIC_`, put in Git or share in chat. Add the token and redeploy to enable setup. Preview testing should use a separate sandbox token.

## Direct Debit

`/direct-debit` sends clients to GoCardless hosted payment pages to authorise a Bacs GBP mandate. The return page verifies a signed HttpOnly cookie and checks the actual billing request status.

This creates a **mandate only**, not a charge or an automatic subscription. Create each client's recurring subscription in the GoCardless dashboard for their agreed amount and start date, after coordinating their old Wix/Stripe plan. The website does not change existing Wix subscriptions. GoCardless is the billing source of truth. No webhooks or payment-status ledger are claimed by this website.

HTTP retries use GoCardless idempotency keys. A valid session reuses a pending billing request or confirms a fulfilled one. A different browser can create another mandate; clients should check with Chris before repeating setup. Bank details never enter this application.

## Enquiry security

`db/cgp-enquiries.sql` records the applied schema. RLS is enabled. Anonymous visitors can insert only the five permitted fields and cannot read, edit or delete enquiries. IDs and timestamps are server controlled. A unique email/day constraint limits duplicates. API routes check origin, bound input, use a honeypot and best-effort instance-level rate limits. These limits are not a distributed anti-bot service.

## Development and verification

```sh
npm ci
npm run dev
npm run build
npm test
```

Tests cover forged payment cookies, enquiry validation and cross-origin rejection. Complete a sandbox GoCardless authorisation test before sending live setup links. No live payments or mandates are created by automated tests.

## Publishing

The original project has Vercel Authentication protection. Explicit owner approval is needed to change that setting for public access. The temporary site uses `noindex`; update metadata and add a canonical URL when the permanent domain is selected.

Photographs come from the owner's DVOTION website and are optimised as WebP. This first version does not publish coaching prices.
