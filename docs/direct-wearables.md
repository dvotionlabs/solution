# CGP direct wearable connections (WHOOP / Oura / Garmin)

## Provider readiness
- WHOOP: direct OAuth2 adapter implemented; a developer app client ID and secret are required before athletes can connect. Developer Sandbox permits up to 10 WHOOP members, then a tier upgrade request.
- Oura: direct OAuth2 + PKCE adapter implemented; developer client ID and secret required. For Gen3 or later, athletes generally need active Oura Membership for API data.
- Garmin: no public self-service equivalent to the WHOOP and Oura cloud endpoints. Apply to Garmin Connect Developer Program; approval, private API specifications and potentially licensing for some commercial metrics are required. Garmin remains disabled until a legitimate developer agreement and API implementation exist.
- Terra is no longer needed for these direct connections. Its existing webhook remains inactive unless the old credentials are added.

## Exact developer callback
Register this URL in the WHOOP and Oura dashboards:
`https://cgp-dvotion.vercel.app/api/portal/wearables/callback`

## Add credentials in Vercel
In the existing CGP project, set these as **encrypted/sensitive production environment variables**, NEVER in NEXT_PUBLIC_:
- `CGP_WHOOP_CLIENT_ID`
- `CGP_WHOOP_CLIENT_SECRET`
- `CGP_OURA_CLIENT_ID`
- `CGP_OURA_CLIENT_SECRET`

`CGP_DIRECT_TOKEN_KEY` is provisioned server-side to encrypt each member's OAuth tokens with AES-256-GCM. `CGP_WEARABLE_INGEST_KEY` already protects the existing ingestion RPC. Do not rotate the token encryption key without migrating the ciphertext.

After setting provider credentials, **redeploy** the CGP project so server-side readiness checks are refreshed.

## Privacy and behaviour
- OAuth state is short-lived, one-time and HttpOnly. Oura OAuth uses S256 PKCE.
- Athletes must explicitly consent to sharing; they control disconnect/deletion.
- Tokens are AES-GCM encrypted at rest in `cgp_direct_wearable_tokens`, restricted by authenticated athlete RLS. They are never returned to the web client in plaintext.
- Reuse `cgp_wearable_connections` and `cgp_wearable_metrics` for consent, coach access, 90-day retention, and removal. Existing admin RLS still applies.
- The app exchanges and refreshes tokens server-side. Each provider's existing token is rotated on refresh.
- Initial sync runs on callback; subsequent sync runs on the athlete's request; we have **not** claimed 24/7 background sync.
- The athlete can delete local metrics and credentials. WHOOP is also revoked remotely when possible; Oura users should remove CGP through Oura's connected-apps controls.
- WHOOP recovery gives actual RMSSD HRV and resting HR. Oura's nighttime lowest heart rate is not misrepresented as resting HR.
- The normalised metrics share the portal's existing steps, sleep duration and HRV types. Provider-specific strain/readiness scores are not yet exposed as dashboard scores. Never infer unavailable measurements.

## Test procedure
1. Verify Supabase schema, column grants and RLS owner restrictions.
2. Configure test WHOOP/Oura developer applications and OAuth redirect URL.
3. Use two separate, authorised athletes: authenticate, grant consent, connect, sync and verify provider-derived metrics.
4. Verify a client cannot view another client's ciphertext or metrics. Confirm admin only sees measurements, not tokens.
5. Disconnect and verify tokens and measurements are deleted. Reconnect using new consent.
6. Test expired refresh token and rejected provider permission.
7. Test Garmin remains visibly pending, not falsely operational.
8. Confirm no unexpected costs or paid services are activated.
