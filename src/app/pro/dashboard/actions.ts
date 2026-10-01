"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled } from "@/lib/ai";
import { buildProfile, type BuiltProfile } from "@/lib/profile-ai";
import { missingRequired } from "./readiness";

export type SaveState = { error?: string; saved?: boolean; at?: number };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lines = (v: string) =>
  v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
const clean = (v: unknown, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const cleanList = (v: unknown, max = 30) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x: string) => x.trim().slice(0, 300)).slice(0, max) : [];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

/* ---------- AI profile builder ---------- */

export async function buildFromNotes(_: SaveState, f: FormData): Promise<SaveState> {
  const { supabase, user } = await requireUser();
  const message = str(f, "message").slice(0, 12000);
  if (!message) return { error: "Write something about yourself first." };
  if (!aiEnabled()) return { error: "The AI isn't configured yet (missing ANTHROPIC_API_KEY)." };

  const { data: pro } = await supabase.from("professionals").select("*").eq("id", user.id).single();
  const { data: services } = await supabase
    .from("services")
    .select("name, description, price_pence, duration_minutes, delivery")
    .eq("professional_id", user.id)
    .order("created_at");
  if (!pro) return { error: "Profile not found." };

  const hasProfile = Boolean(pro.profession || pro.bio || (services ?? []).length);
  const current: Partial<BuiltProfile> | null = hasProfile
    ? {
        display_name: pro.display_name,
        profession: pro.profession,
        headline: pro.headline,
        bio: pro.bio,
        approach: pro.approach,
        years_experience: pro.years_experience,
        qualifications: pro.qualifications,
        education: pro.education,
        specialties: pro.specialties,
        equipment: pro.equipment,
        area: pro.area,
        city: pro.city,
        postcode: pro.postcode,
        offers_online: pro.offers_online,
        contact_email: pro.contact_email,
        phone: pro.phone,
        website: pro.website,
        extra_sections: pro.extra_sections,
        services: (services ?? []).map((s) => ({
          name: s.name,
          description: s.description,
          price_gbp: s.price_pence != null ? s.price_pence / 100 : null,
          duration_minutes: s.duration_minutes,
          delivery: s.delivery,
        })),
      }
    : null;

  let built: BuiltProfile;
  try {
    built = await buildProfile(message, current);
  } catch (e) {
    console.error(e);
    return { error: "The AI couldn't process that just now. Please try again." };
  }

  let website = clean(built.website, 300);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const years = typeof built.years_experience === "number" ? Math.max(0, Math.min(80, Math.round(built.years_experience))) : null;
  const extras = Array.isArray(built.extra_sections)
    ? built.extra_sections
        .filter((e) => e && typeof e.title === "string" && typeof e.body === "string" && e.title.trim() && e.body.trim())
        .map((e) => ({ title: e.title.trim().slice(0, 80), body: e.body.trim().slice(0, 2000) }))
        .slice(0, 10)
    : [];
  const stamp = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("professionals")
    .update({
      display_name: clean(built.display_name, 120) || pro.display_name,
      profession: clean(built.profession, 120),
      headline: clean(built.headline, 200),
      bio: clean(built.bio),
      approach: clean(built.approach),
      years_experience: years,
      qualifications: cleanList(built.qualifications),
      education: cleanList(built.education),
      specialties: cleanList(built.specialties, 20),
      equipment: cleanList(built.equipment),
      area: clean(built.area, 120),
      city: clean(built.city, 80) || "London",
      postcode: clean(built.postcode, 12).toUpperCase(),
      offers_online: Boolean(built.offers_online),
      contact_email: clean(built.contact_email, 200) || pro.contact_email,
      phone: clean(built.phone, 40),
      website,
      extra_sections: extras,
      followups: cleanList(built.followups, 4),
      profile_notes: `${pro.profile_notes ? `${pro.profile_notes}\n\n` : ""}[${stamp}]\n${message}`.slice(-40000),
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  const newServices = (Array.isArray(built.services) ? built.services : [])
    .filter((s) => s && typeof s.name === "string" && s.name.trim())
    .slice(0, 20)
    .map((s) => ({
      professional_id: user.id,
      name: s.name.trim().slice(0, 120),
      description: clean(s.description, 1000),
      price_pence: typeof s.price_gbp === "number" && s.price_gbp >= 0 ? Math.round(s.price_gbp * 100) : null,
      duration_minutes: typeof s.duration_minutes === "number" && s.duration_minutes > 0 ? Math.round(s.duration_minutes) : null,
      delivery: ["in_person", "online", "both"].includes(s.delivery) ? s.delivery : "in_person",
    }));
  await supabase.from("services").delete().eq("professional_id", user.id);
  if (newServices.length) {
    const { error: sErr } = await supabase.from("services").insert(newServices);
    if (sErr) return { error: sErr.message };
  }

  revalidatePath("/pro/dashboard");
  return { saved: true, at: Date.now() };
}

/* ---------- Manual edits ---------- */

export async function saveProfile(_: SaveState, f: FormData): Promise<SaveState> {
  const { supabase, user } = await requireUser();
  let website = str(f, "website");
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const years = str(f, "years_experience");

  const { error } = await supabase
    .from("professionals")
    .update({
      display_name: str(f, "display_name"),
      profession: str(f, "profession"),
      headline: str(f, "headline"),
      bio: str(f, "bio"),
      approach: str(f, "approach"),
      years_experience: years ? Math.max(0, Math.min(80, parseInt(years, 10) || 0)) : null,
      qualifications: lines(str(f, "qualifications")),
      education: lines(str(f, "education")),
      specialties: lines(str(f, "specialties")).slice(0, 20),
      equipment: lines(str(f, "equipment")),
      area: str(f, "area"),
      city: str(f, "city") || "London",
      postcode: str(f, "postcode").toUpperCase(),
      offers_online: f.get("offers_online") === "on",
      website,
      contact_email: str(f, "contact_email"),
      phone: str(f, "phone"),
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/pro/dashboard");
  return { saved: true, at: Date.now() };
}

export async function removeExtraSection(index: number) {
  const { supabase, user } = await requireUser();
  const { data: pro } = await supabase.from("professionals").select("extra_sections").eq("id", user.id).single();
  const extras = Array.isArray(pro?.extra_sections) ? [...pro.extra_sections] : [];
  extras.splice(index, 1);
  await supabase.from("professionals").update({ extra_sections: extras }).eq("id", user.id);
  revalidatePath("/pro/dashboard");
}

export async function setPhoto(url: string) {
  const { supabase, user } = await requireUser();
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${user.id}/`;
  if (url && !url.startsWith(base)) throw new Error("Invalid photo URL");
  await supabase.from("professionals").update({ photo_url: url }).eq("id", user.id);
  revalidatePath("/pro/dashboard");
}

export async function setPublished(published: boolean): Promise<SaveState> {
  const { supabase, user } = await requireUser();
  if (published) {
    const { data: pro } = await supabase.from("professionals").select("*").eq("id", user.id).single();
    const { count } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", user.id);
    const missing = pro ? missingRequired(pro, count ?? 0) : ["profile"];
    if (missing.length) return { error: `Still needed: ${missing.join(", ")}.` };
  }
  const { error } = await supabase.from("professionals").update({ published }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/pro/dashboard");
  return { saved: true, at: Date.now() };
}

function serviceFields(f: FormData) {
  const price = str(f, "price");
  const duration = str(f, "duration");
  const delivery = str(f, "delivery");
  return {
    name: str(f, "name"),
    description: str(f, "description"),
    price_pence: price ? Math.round(parseFloat(price) * 100) : null,
    duration_minutes: duration ? parseInt(duration, 10) || null : null,
    delivery: ["in_person", "online", "both"].includes(delivery) ? delivery : "in_person",
  };
}

export async function saveService(_: SaveState, f: FormData): Promise<SaveState> {
  const { supabase, user } = await requireUser();
  const fields = serviceFields(f);
  if (!fields.name) return { error: "Give the service a name." };
  const id = str(f, "id");
  const { error } = id
    ? await supabase.from("services").update(fields).eq("id", id)
    : await supabase.from("services").insert({ ...fields, professional_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/pro/dashboard");
  return { saved: true, at: Date.now() };
}

export async function deleteService(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/pro/dashboard");
}
