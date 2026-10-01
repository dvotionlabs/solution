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
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:py-20 md:grid-cols-[minmax(0,1fr)_400px] md:items-start">
      <div>
        <h1 className="text-[2.4rem] font-semibold leading-[1.08] tracking-tight sm:text-[3rem]">For professionals</h1>
        <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-muted">
          £29 per month. The first three months are free.
        </p>
      </div>
      <AuthForm />
    </div>
  );
}
