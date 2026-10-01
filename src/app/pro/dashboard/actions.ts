"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error?: string; saved?: boolean };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

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

  const { error } = await supabase
    .from("professionals")
    .update({
      display_name: str(f, "display_name"),
      profession: str(f, "profession"),
      headline: str(f, "headline"),
      bio: str(f, "bio"),
      area: str(f, "area"),
      city: str(f, "city") || "London",
      postcode: str(f, "postcode").toUpperCase(),
      offers_online: f.get("offers_online") === "on",
      specialties: str(f, "specialties")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
      website,
      contact_email: str(f, "contact_email"),
      phone: str(f, "phone"),
      published: f.get("published") === "on",
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/pro/dashboard");
  return { saved: true };
}

export async function addService(_: SaveState, f: FormData): Promise<SaveState> {
  const { supabase, user } = await requireUser();
  const name = str(f, "name");
  if (!name) return { error: "Give the service a name." };
  const price = str(f, "price");
  const duration = str(f, "duration");
  const delivery = str(f, "delivery");

  const { error } = await supabase.from("services").insert({
    professional_id: user.id,
    name,
    description: str(f, "description"),
    price_pence: price ? Math.round(parseFloat(price) * 100) : null,
    duration_minutes: duration ? parseInt(duration, 10) : null,
    delivery: ["in_person", "online", "both"].includes(delivery) ? delivery : "in_person",
  });
  if (error) return { error: error.message };
  revalidatePath("/pro/dashboard");
  return { saved: true };
}

export async function deleteService(f: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("services").delete().eq("id", str(f, "id"));
  revalidatePath("/pro/dashboard");
}
