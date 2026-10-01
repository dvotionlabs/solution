# Solution

Find your professional. Professionals create a profile and list their services; members of the public describe what they need and an AI matcher shows the best-fitting options.

## Stack
- Next.js (App Router) on Vercel
- Supabase (Postgres + Auth), project `solution` (eu-west-2)
- Anthropic API for parsing requests and ranking matches

## Environment
Copy `.env.example` to `.env.local`. `ANTHROPIC_API_KEY` is optional locally; without it search falls back to keyword matching.

## Routes
- `/` search
- `/p/[id]` public professional page
- `/pro` professional sign up / sign in
- `/pro/dashboard` profile and services editor
- `/api/search` matcher

## Billing
Every new professional starts on a three-month free trial (`trial_ends_at`). After that the plan is £29/month. Billing is not wired up yet; `subscription_status` can only be changed with the service role.
