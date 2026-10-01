import { deliveryLabel, formatPrice, type Candidate } from "@/lib/types";

export type ProfileData = Omit<Candidate, "rank">;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h2 className="label">{title}</h2>
      {children}
    </section>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {text
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p.trim()}
          </p>
        ))}
    </div>
  );
}

// The full profile as a member of the public sees it.
export function ProfileView({ p }: { p: ProfileData }) {
  const location = [p.area, p.city].filter(Boolean).join(", ");
  const meta = [
    location,
    p.years_experience != null ? `${p.years_experience} years experience` : null,
    p.offers_online ? "Online available" : null,
  ].filter(Boolean);

  return (
    <article className="space-y-6 rounded-lg border border-line bg-surface p-5 sm:p-7">
      <header className="flex items-start gap-4">
        {p.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-line text-xl font-medium text-muted">
            {initials(p.display_name)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{p.display_name || "Your name"}</h1>
          {p.profession && <p className="mt-0.5">{p.profession}</p>}
          {meta.length > 0 && <p className="mt-1 text-sm text-muted">{meta.join(" · ")}</p>}
        </div>
      </header>

      {p.headline && <p className="text-lg leading-snug">{p.headline}</p>}

      {p.specialties.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {p.specialties.map((s) => (
            <li key={s} className="rounded border border-line px-2 py-0.5 text-xs text-muted">
              {s}
            </li>
          ))}
        </ul>
      )}

      {p.bio && (
        <Block title="About">
          <Paragraphs text={p.bio} />
        </Block>
      )}

      {p.approach && (
        <Block title="Approach">
          <Paragraphs text={p.approach} />
        </Block>
      )}

      {p.services.length > 0 && (
        <Block title="Services and prices">
          <div className="divide-y divide-line">
            {p.services.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                <div className="min-w-0">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted">
                    {[s.duration_minutes ? `${s.duration_minutes} min` : null, deliveryLabel[s.delivery]]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {s.description && <p className="mt-1 text-sm text-muted whitespace-pre-line">{s.description}</p>}
                </div>
                <div className="shrink-0 font-mono text-sm">{formatPrice(s.price_pence)}</div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {(p.qualifications.length > 0 || p.education.length > 0) && (
        <div className="grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
          {p.qualifications.length > 0 && (
            <div>
              <h2 className="label">Qualifications</h2>
              <ul className="space-y-1 text-sm">
                {p.qualifications.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {p.education.length > 0 && (
            <div>
              <h2 className="label">Education</h2>
              <ul className="space-y-1 text-sm">
                {p.education.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {p.equipment.length > 0 && (
        <Block title="Equipment and facilities">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {p.equipment.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Block>
      )}

      {p.extra_sections.map((e, i) => (
        <Block key={i} title={e.title}>
          <Paragraphs text={e.body} />
        </Block>
      ))}

      {(p.contact_email || p.phone || p.website) && (
        <Block title="Contact">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {p.contact_email && (
              <a className="underline" href={`mailto:${p.contact_email}`}>
                {p.contact_email}
              </a>
            )}
            {p.phone && (
              <a className="underline" href={`tel:${p.phone}`}>
                {p.phone}
              </a>
            )}
            {p.website && (
              <a className="underline" href={p.website} target="_blank" rel="noreferrer">
                {p.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </Block>
      )}
    </article>
  );
}
