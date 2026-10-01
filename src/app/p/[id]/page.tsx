import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView, type ProfileData } from "@/components/ProfileView";

export default async function ProfilePage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pro } = await supabase.from("professionals").select("*").eq("id", id).maybeSingle();
  if (!pro) notFound();
  const { data: services } = await supabase
    .from("services")
    .select("name, description, price_pence, duration_minutes, delivery")
    .eq("professional_id", id)
    .order("price_pence", { nullsFirst: false });

  const profile: ProfileData = { ...pro, services: services ?? [] };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <ProfileView p={profile} />
    </div>
  );
}
