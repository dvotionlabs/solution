# CGP athlete portal

Routes: `/portal` for clients, `/admin` for the coach. Both use invitation-only portal profiles and Supabase email/password authentication. Auth tokens are kept in secure HTTP-only cookies; every data request validates the user and active profile. The database also enforces client isolation through RLS.

## Getting started

1. Activate the coach account using its separately supplied, single-use private invitation. Never commit access links, passwords or credential values.
2. In **Clients**, add each name and email. Enter their current balance with **Add sessions**, then add upcoming bookings. Opening balances should include sessions still owed; do not re-enter past sessions already deducted from that balance.
3. Use **Create access link** and share it privately. Links expire after seven days. A new link invalidates previous unused ones. Existing clients can use a new link to set a new password or sign in with their existing password. No emails are sent automatically.
4. In **Exercises**, add public or unlisted YouTube videos with embedding enabled, category and coaching cues. Assign homework with client-specific instructions. Clients can mark an assignment done once each day in London time. Add the channel URL in **Settings** when available.

An active pack's **sessions left** is its allocation minus completed and chargeable missed sessions. **Available to book** also subtracts scheduled sessions. Cancelling releases the reservation. Bookings cannot exceed their assigned pack, use another client's pack, fall outside pack dates or overlap another scheduled session. A consultation can have no pack. All diary inputs and times use Europe/London.

Past and upcoming bookings are retained. Monthly credits are allocated manually. Existing calendars, old attendance records, payments and session balances have not been imported or automatically linked. A payment reference can be entered on a credit allocation to prevent crediting the same purchase twice.

Pausing a client blocks portal access and new wearable data ingestion while preserving coaching records. Restoring access uses the same account. Invitations also require an active profile.

## Wearable activation

The integration uses Terra; a Terra account and provider access must be arranged separately. No paid account is provisioned by the application. The available web providers are Garmin, WHOOP, Oura, Fitbit, Polar, Suunto and Withings. Provider availability and metric coverage depend on the Terra account and device. Apple Health and Android Health Connect require mobile SDK work and are not implemented here.

Set production environment variables `TERRA_API_KEY`, `TERRA_DEV_ID` and `TERRA_SIGNING_SECRET` in Vercel. `CGP_WEARABLE_INGEST_KEY` has a separate, randomly generated capability stored in Vercel with only its SHA-256 hash in `cgp_private.portal_ingest_credentials`. Do not expose these in `NEXT_PUBLIC_*` variables. No Supabase service key is used in Vercel.

Configure Terra's webhook destination as `https://cgp-dvotion.vercel.app/api/webhooks/terra`, enable auth, daily, sleep, user reauth and access revocation events, then redeploy. Complete a real provider connection and webhook smoke test before enabling client use. The portal displays setup status until all required credentials exist; presence of credentials alone does not prove provider approval or a successful sync.

Clients explicitly consent before opening the Terra connection widget. The webhook validates the raw body, signature and five-minute timestamp window. Its dedicated database RPC is a write-only capability; it can only attach data to a matching, consented connection. Only selected summary values are stored: daily steps, sleep duration, HRV RMSSD, HRV SDNN and resting heart rate. RMSSD and SDNN are never combined. Missing readings stay missing. The UI shows the latest 30 days, separately by source, with source dates. Data older than 90 days is pruned on sync.

Disconnecting blocks ingestion and deletes readings locally before attempting provider deauthentication. If Terra cannot be reached, the client is told to also revoke access in the wearable app. The revocation webhook also deletes local readings. Cancelled connection attempts can be removed with the same disconnect control before retrying.

## Backend and verification

Project: CGP (`algwytnelmnjhkmonxro`), not the separate DVOTION project. `db/cgp-portal.sql` contains the additive schema and grants. `supabase/functions/cgp-portal-invite/index.ts` is deployed as `cgp-portal-invite`, using the service credential available only inside the Edge runtime. Its gateway JWT check is disabled because it implements its own 256-bit, hashed, expiring, single-use invitation authentication. Redemption is service-only and atomically matches the confirmed account email. Recovery can affect only the exact account already linked to that invitation's profile.

`npm test` covers balance rules, London time conversions, allowed video links, webhook signature tampering/replay and summary normalisation. `db/cgp-portal.verify.sql` exercises admin/athlete RLS, booking guards, homework and invite privileges in a rolled-back transaction. Run with an administrative database connection, never as a public endpoint. `npm run build` checks all route compilation and TypeScript. No real wearable sync is claimed until provider credentials and a real device have been tested.
