"use client";

import { useState } from "react";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import type { Match } from "@/lib/types";

export function Search() {
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
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <textarea
          className="input min-h-24 flex-1 resize-y"
          placeholder="e.g. I'm looking for a PT near Liverpool Street, up to £60 a session"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button className="btn sm:self-end" disabled={loading || !query.trim()}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {matches && (
        <section className="mt-10 space-y-4">
          {matches.length === 0 ? (
            <p className="text-sm text-muted">No professionals matched that request yet.</p>
          ) : (
            matches.map((m) => <ProfessionalCard key={m.id} m={m} />)
          )}
        </section>
      )}
    </div>
  );
}
