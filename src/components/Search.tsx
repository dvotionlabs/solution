"use client";

import { useState } from "react";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import type { Match } from "@/lib/types";

export function Search({ samples = false }: { samples?: boolean }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, samples }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed. Try again.");
      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_0_var(--line)] focus-within:border-accent sm:p-5">
        <label htmlFor="q" className="label">
          What are you looking for?
        </label>
        <textarea
          id="q"
          rows={3}
          className="serif w-full resize-none bg-transparent text-xl leading-snug outline-none placeholder:text-muted/70 sm:text-2xl"
          placeholder="I'm looking for a PT near Liverpool Street, up to £60 a session"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="mt-3 flex items-center justify-end">
          <button className="btn px-6" disabled={loading || !query.trim()}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {error && <p className="mt-6 text-sm text-danger">{error}</p>}

        {loading && <p className="mt-10 text-muted">Reading through profiles to find the best fit…</p>}

        {!loading && matches && (
          <section className="mt-10">
            {matches.length === 0 ? (
              <p className="text-muted">
                No professionals match that yet. Try a different area, or describe what you need in other words.
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted">
                  {matches.length} {matches.length === 1 ? "professional" : "professionals"} for your request
                </p>
                <div className="space-y-4">
                  {matches.map((m) => (
                    <ProfessionalCard key={m.id} m={m} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
