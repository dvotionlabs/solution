import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "./AuthForm";

export default async function ProPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/pro/dashboard");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">For professionals</h1>
      <p className="mt-3 text-sm text-muted">£29 per month. The first three months are free.</p>
      <div className="mt-8">
        <AuthForm />
      </div>
    </div>
  );
}
