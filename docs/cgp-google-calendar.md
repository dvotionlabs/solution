# CGP Google Calendar → individual athlete bookings

## Behaviour
CGP reads the coach's **primary Google Calendar** with the **calendar.events.readonly** OAuth scope. It cannot edit or delete Google events. Sync runs through Vercel cron approximately every 10 minutes; the coach can also click **Sync calendar now** under CGP Admin → Settings.

The admin creates explicit case-insensitive exact-title mappings, e.g.:
- Google event title `Akash` → CGP athlete `Aakash Kabra`.
- Google event title `Aakash` → the same athlete.

`Akash PT`, `Discuss Akash`, `Aakash and Susie`, private meetings, all-day events, unmatched names, and unexpected event types are **not** imported automatically. If the coach wants one of those titles matched, they can explicitly add that exact title to one athlete. A title cannot be assigned to two athletes.

CGP imports only the date/time and matched client identity; its own booking title is always **Coaching session**. Other event names, descriptions, guests, locations, Google meeting links and personal appointments never enter the athlete portal. Existing booking RLS permits an athlete to read only their own bookings.

## Calendar changes and credits
- A new confirmed event creates a scheduled booking for the mapped athlete.
- A rescheduled event updates that particular future booking.
- Removing or renaming the event cancels its corresponding future **scheduled** booking.
- Completed/missed bookings are retained; Google cannot overwrite coach-verified attendance.
- The importer never touches manual bookings unless they match the same athlete/start/end exactly; in that case it links rather than duplicates the appointment.
- A valid available client credit pack is automatically assigned where possible, reserving one slot. Booked reservations and completed-session deductions are distinct. If no eligible pack exists, the appointment still appears with no credit allocated; add or assign an appropriate pack.
- The sync checks a rolling 75-day future horizon, expands recurring calendar events, rejects incomplete result pagination and never auto-completes a session.
- Bookings with an overlapping existing confirmed session are skipped rather than leaking a different client's appointment.
- Only the coach can manage mappings; athletes cannot read them.

## One-time setup (no Terra or paid Google integrations)
1. In Google Cloud Console, create a project and enable the Google Calendar API.
2. Configure the OAuth consent screen and create an OAuth client with **Web application** type.
3. Use this exact redirect URI:
   `https://cgp-dvotion.vercel.app/api/admin/calendar/callback`
4. Add these environment variables privately under the existing **CGP Vercel project** (production):
   - `CGP_GOOGLE_CLIENT_ID`
   - `CGP_GOOGLE_CLIENT_SECRET`
   Do not place client secrets in Git or NEXT_PUBLIC variables. CGP already stores `CGP_DIRECT_TOKEN_KEY` and its cron secret on Vercel; neither should be exposed.
5. Redeploy production so the environment variables apply.
6. In `https://cgp-dvotion.vercel.app/admin?tab=settings`, choose **Connect Google Calendar** and authorise the correct Google account.
7. In the same Settings page, add exact title mappings for each client. Initial Aakash/Akash aliases are already present. Click **Sync calendar now** to verify new appointments.
8. Open the athlete portal as a separate invited athlete to confirm only their own booking is visible.

### Billing and OAuth notes
The direct Google Calendar API integration has no separate calendar-sync platform subscription. The existing DVOTION Vercel team is on a Pro plan with per-minute-capable cron; every-ten-minute checks consume the existing included function resources. Google OAuth testing-mode refresh tokens may expire rapidly; for durable use configure Google's app publishing/verification settings as applicable to your account and scopes.

### Security model
- A short-lived, HttpOnly state cookie protects Google authorisation against CSRF.
- Google refresh tokens are AES-256-GCM encrypted server-side. The private database never returns plaintext tokens to browsers.
- A separate long random cron secret controls the restricted database RPC used for scheduled imports; only the secret's SHA-256 digest is stored in Supabase.
- The mapping table has RLS policies permitting only the admin to read/modify it.
- The private Google event links and encrypted tokens are stored in the unexposed `cgp_private` schema.
- Google API responses are restricted to selected fields; coach-only data is never broadcast to athletes.
- Disconnect stops future syncing without deleting valid previously assigned CGP sessions.

## Test
- `npm test` includes strict matching, ambiguity rejection, and OAuth-state tests.
- `npm run build` compiles Next.js routes, UI and Cron endpoint.
- In a rolled-back Supabase transaction, a synthetic Aakash event was created, re-imported idempotently, then cancelled with zero permanent bookings or linked accounts left behind.
- End-to-end Google OAuth cannot be verified until actual Google Cloud application credentials are supplied by the coach.
