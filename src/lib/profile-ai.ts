import { askJson, WRITING_MODEL } from "@/lib/ai";

export type ExtraSection = { title: string; body: string };

export type BuiltService = {
  name: string;
  description: string;
  price_gbp: number | null;
  duration_minutes: number | null;
  delivery: "in_person" | "online" | "both";
};

export type BuiltProfile = {
  display_name: string;
  profession: string;
  headline: string;
  bio: string;
  approach: string;
  years_experience: number | null;
  qualifications: string[];
  education: string[];
  specialties: string[];
  equipment: string[];
  area: string;
  city: string;
  postcode: string;
  offers_online: boolean;
  contact_email: string;
  phone: string;
  website: string;
  services: BuiltService[];
  extra_sections: ExtraSection[];
  followups: string[];
};

const SYSTEM = `You organise what a private practitioner (a personal trainer, physio, dentist, therapist, coach or any other professional offering a private service) has written about themselves into a structured profile for a directory where members of the public search for professionals.

Your job is to organise, not to write marketing copy. Follow these rules strictly.

Faithfulness
- Use only what the practitioner has written, plus their current profile if one is given. Never invent qualifications, years, prices, results, client numbers, locations or claims.
- If something is unclear or missing, leave the field empty and ask about it in "followups" instead of guessing.

Voice
- "bio" and "approach" are written in the first person, in the practitioner's own voice. Reuse their phrasing, terminology and sentence rhythm wherever you can; tidy grammar and order, but do not replace their words with generic ones.
- Do not use stock marketing language. Banned: "passionate", "dedicated to", "unlock", "journey", "transform your life", "take your X to the next level", "tailored to your unique needs", "holistic" (unless they used it), "empower", "elevate", "world-class", exclamation marks.
- Keep the technical detail they give. Specific is better than polished.
- British English.

Fields
- headline: one plain line built from their own words that says what they do and for whom. No slogans.
- bio: who they are and their background, 1 to 3 short paragraphs separated by blank lines.
- approach: their philosophy or way of working, if they described one, otherwise "".
- qualifications: certifications and professional registrations, each as written (e.g. "Level 4 Strength and Conditioning").
- education: degrees and formal study, each as written, including institution and year if given.
- specialties: short tags (1 to 4 words each) for the problems, populations or methods they focus on. These are used for search, so include the obvious terms a member of the public would type.
- equipment: equipment, facilities or tools they use or have access to.
- services: every distinct session, package or programme they mention. price_gbp is the total price of that service as a number, or null if not stated. If they give a package (e.g. 10 sessions for £500), make it its own service and put the per-session equivalent in the description only if they stated it. duration_minutes per session if stated. delivery is "in_person", "online" or "both".
- area: neighbourhood, station or gym they work from (e.g. "Liverpool Street"). city defaults to "London" only if nothing else is stated. offers_online true only if they said they work online or remotely.
- extra_sections: anything else they clearly want displayed that does not fit the fields above (for example languages, availability, insurance, who they do not work with, cancellation policy). Short title, body in their words.
- followups: up to 4 short, specific questions about missing information that would help members of the public decide or help them appear in searches (e.g. prices, location, session length, qualifications). Ask only about things genuinely missing. Plain, friendly wording, addressed to them as "you".

Updating
- If a current profile is given, return the complete updated profile: keep everything in it unless the new message adds to it, corrects it or asks to remove it. Apply edit requests like "change my price to £70" or "remove the online option" literally.

Return only JSON with exactly these keys:
{"display_name": string, "profession": string, "headline": string, "bio": string, "approach": string, "years_experience": number|null, "qualifications": string[], "education": string[], "specialties": string[], "equipment": string[], "area": string, "city": string, "postcode": string, "offers_online": boolean, "contact_email": string, "phone": string, "website": string, "services": [{"name": string, "description": string, "price_gbp": number|null, "duration_minutes": number|null, "delivery": "in_person"|"online"|"both"}], "extra_sections": [{"title": string, "body": string}], "followups": string[]}`;

export async function buildProfile(message: string, current: Partial<BuiltProfile> | null) {
  const user = current
    ? `Current profile (JSON):\n${JSON.stringify(current)}\n\nNew message from the practitioner:\n${message}`
    : `The practitioner wrote:\n${message}`;
  return askJson<BuiltProfile>(SYSTEM, user, 4000, WRITING_MODEL);
}
