import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliveryLabel, formatPrice } from "@/lib/types";
import { signOut } from "../auth-actions";
import { deleteService } from "./actions";
import { AddServiceForm, ProfileForm } from "./forms";

function statusLine(pro: { subscription_status: string; trial_ends_at: string }) {
  if (pro.subscription_status === "active") return "Subscription active";
  if (pro.subscription_status === "trial") {
    const ends = new Date(pro.trial_ends_at);
    if (ends > new Date()) {
      return `Free trial until ${ends.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
    }
    return "Free trial ended";
  }
  return "Subscription inactive";
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/pro");

  const { data: pro } = await supabase.from("professionals").select("*").eq("id", user.id).single();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("professional_id", user.id)
    .order("created_at");
  if (!pro) redirect("/pro");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-muted">
            {statusLine(pro)} · {pro.published ? "Visible in search" : "Hidden from search"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-ghost" href={`/p/${pro.id}`}>View public page</Link>
          <form action={signOut}>
            <button className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <ProfileForm pro={pro} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Services</h2>
        <div className="mt-4 space-y-2">
          {(services ?? []).map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface p-4">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted">
                  {[formatPrice(s.price_pence), s.duration_minutes ? `${s.duration_minutes} min` : null, deliveryLabel[s.delivery as keyof typeof deliveryLabel]]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
              </div>
              <form action={deleteService}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm text-muted hover:text-foreground">Remove</button>
              </form>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-surface">
          <AddServiceForm />
        </div>
      </section>
    </div>
  );
}
