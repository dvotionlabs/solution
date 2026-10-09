import { clientPlanQuote } from '@/lib/client-pricing';
import { rateLimited } from '@/lib/rate-limit';
import { sameOrigin } from '@/lib/validation';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!sameOrigin(request)) return Response.json({ error: 'Please use the CG Performance website.' }, { status: 403, headers });
  if (rateLimited(request, 'client-plan', 15)) return Response.json({ error: 'Please wait a few minutes before trying again.' }, { status: 429, headers });
  try {
    const raw = await request.text();
    if (raw.length > 200) throw new Error('Invalid request');
    const plan = clientPlanQuote(JSON.parse(raw)?.code);
    if (!plan) return Response.json({ error: 'Code not recognised. Check your code or contact Chris.' }, { status: 400, headers });
    return Response.json({ plan }, { headers });
  } catch {
    return Response.json({ error: 'Please enter a valid client code.' }, { status: 400, headers });
  }
}
