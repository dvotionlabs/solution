import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import type { Match } from "@/lib/types";

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

  const match: Match = { ...pro, services: services ?? [], rank: 0, reason: null };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <ProfessionalCard m={match} />
      {pro.bio && (
        <section className="mt-8">
          <h2 className="label">About</h2>
          <p className="whitespace-pre-line">{pro.bio}</p>
        </section>
      )}
      {(services ?? []).some((s) => s.description) && (
        <section className="mt-8 space-y-4">
          <h2 className="label">Services</h2>
          {(services ?? []).map((s, i) => (
            <div key={i}>
              <div className="font-medium">{s.name}</div>
              {s.description && <p className="text-sm text-muted whitespace-pre-line">{s.description}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
