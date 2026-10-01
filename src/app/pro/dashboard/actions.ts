"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { missingRequired } from "./readiness";

export type SaveState = { error?: string; saved?: boolean; at?: number };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const list = (v: string, sep: RegExp) =>
  v
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

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
      years_experience: years ? Math.max(0, Math.min(80, parseInt(years, 10) || 0)) : null,
      qualifications: list(str(f, "qualifications"), /\n/),
      specialties: list(str(f, "specialties"), /,/),
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
