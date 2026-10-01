import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth-actions";
import { Dashboard, type Pro, type ServiceRow } from "./forms";

// Building a profile with the AI can take up to ~30 seconds.
export const maxDuration = 120;

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/pro");

  const { data: pro } = await supabase.from("professionals").select("*").eq("id", user.id).single();
  if (!pro) redirect("/pro");
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_pence, duration_minutes, delivery")
    .eq("professional_id", user.id)
    .order("price_pence", { nullsFirst: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-muted">{statusLine(pro)}</p>
        </div>
        <div className="flex gap-2">
          {pro.published && (
            <Link className="btn btn-ghost" href={`/p/${pro.id}`}>
              View public page
            </Link>
          )}
          <form action={signOut}>
            <button className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </div>
      <Dashboard pro={pro as Pro} services={(services ?? []) as ServiceRow[]} />
    </div>
  );
}
