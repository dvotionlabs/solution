import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled, askJson } from "@/lib/ai";
import type { Candidate, Match } from "@/lib/types";

type Parsed = {
  keywords: string[];
  area: string | null;
  max_price_gbp: number | null;
};

type Ranked = { matches: { id: string; reason: string }[] };

const STOPWORDS = new Set(
  "i im i'm a an the for to and or of in on at with me my looking need want help someone who can find near around about this that is are be per session".split(
    " ",
  ),
);

const PARSE_SYSTEM = `You turn a member of the public's request for a private professional service into search parameters.
Return only JSON: {"keywords": string[], "area": string|null, "max_price_gbp": number|null}.
- keywords: 2 to 8 lowercase single words describing the profession and what they need help with, including common synonyms (e.g. "pt" -> "personal", "trainer"; "physio" -> "physiotherapist", "physiotherapy").
- area: the London area, station or postcode they mention, otherwise null.
- max_price_gbp: the most they want to pay per session if stated, otherwise null.`;

const RANK_SYSTEM = `You help a member of the public choose a private professional. You are given their request and a list of professionals as JSON.
Pick up to 5 that best fit the request, best first. Only include a professional if they are a reasonable fit.
For each, write one plain sentence explaining the fit, using only facts present in that professional's data. Never invent qualifications, prices, locations or claims.
Return only JSON: {"matches": [{"id": string, "reason": string}]}.`;

async function candidates(q: string, area: string | null, maxPence: number | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_candidates", {
    q,
    area_q: area ?? "",
    max_price_pence: maxPence,
    lim: 30,
  });
  if (error) throw error;
  return (data ?? []) as Candidate[];
}

export async function POST(request: Request) {
  const { query } = (await request.json().catch(() => ({}))) as { query?: string };
  const text = (query ?? "").trim().slice(0, 500);
  if (!text) return NextResponse.json({ matches: [] });

  try {
    if (!aiEnabled()) {
      const words = text
        .toLowerCase()
        .replace(/[^a-z0-9£\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));
      const found = await candidates(words.join(" or "), null, null);
      const matches: Match[] = found.slice(0, 5).map((c) => ({ ...c, reason: null }));
      return NextResponse.json({ matches, ai: false });
    }

    const parsed = await askJson<Parsed>(PARSE_SYSTEM, text, 300);
    const q = (parsed.keywords ?? []).join(" or ");
    const maxPence = parsed.max_price_gbp != null ? Math.round(parsed.max_price_gbp * 100) : null;

    let found = await candidates(q, parsed.area, maxPence);
    if (found.length === 0 && maxPence != null) found = await candidates(q, parsed.area, null);
    if (found.length === 0) return NextResponse.json({ matches: [], ai: true });

    const slim = found.map((c) => ({
      id: c.id,
      profession: c.profession,
      headline: c.headline,
      bio: c.bio.slice(0, 600),
      area: c.area,
      city: c.city,
      offers_online: c.offers_online,
      specialties: c.specialties,
      services: c.services,
    }));
    const ranked = await askJson<Ranked>(
      RANK_SYSTEM,
      `Request: ${text}\n\nProfessionals:\n${JSON.stringify(slim)}`,
      1200,
    );
    const byId = new Map(found.map((c) => [c.id, c]));
    const matches: Match[] = (ranked.matches ?? [])
      .filter((m) => byId.has(m.id))
      .slice(0, 5)
      .map((m) => ({ ...byId.get(m.id)!, reason: m.reason }));

    return NextResponse.json({ matches, ai: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
