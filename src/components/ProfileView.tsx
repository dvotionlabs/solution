import { Avatar, Meta } from "@/components/ProfessionalCard";
import { deliveryLabel, formatPrice, type Candidate } from "@/lib/types";

export type ProfileData = Omit<Candidate, "rank">;

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
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

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-lg font-semibold">{children}</h2>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((q) => (
        <li key={q}>{q}</li>
      ))}
    </ul>
  );
}

// The full profile as a member of the public sees it.
// Lays out in two columns when its container is wide enough.
export function ProfileView({ p }: { p: ProfileData }) {
  const location = [p.area, p.city].filter(Boolean).join(", ");

  return (
    <article className="@container rounded-xl border border-line bg-surface">
      <header className="flex items-start gap-5 border-b border-line p-6 sm:p-8">
        <Avatar name={p.display_name} url={p.photo_url} size={76} />
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-semibold leading-tight sm:text-[2rem] tracking-tight">{p.display_name || "Your name"}</h1>
          <p className="mt-1 text-[1.05rem]">
            {p.profession}
            {location && <span className="text-muted">, {location}</span>}
          </p>
          <div className="mt-1.5">
            <Meta
              items={[
                p.years_experience != null && `${p.years_experience} years experience`,
                p.offers_online && "Online available",
                p.is_sample && "Sample profile",
              ]}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-x-10 gap-y-8 p-6 sm:p-8 @3xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          {p.headline && <p className="serif text-[1.35rem] leading-snug">{p.headline}</p>}

          {p.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.specialties.map((s) => (
                <span key={s} className="tag">{s}</span>
              ))}
            </div>
          )}

          {p.bio && (
            <section>
              <Heading>About</Heading>
              <Paragraphs text={p.bio} />
            </section>
          )}

          {p.approach && (
            <section>
              <Heading>Approach</Heading>
              <Paragraphs text={p.approach} />
            </section>
          )}

          {p.extra_sections.map((e, i) => (
            <section key={i}>
              <Heading>{e.title}</Heading>
              <Paragraphs text={e.body} />
            </section>
          ))}
        </div>

        <aside className="space-y-8 @3xl:border-l @3xl:border-line @3xl:pl-10">
          {p.services.length > 0 && (
            <section>
              <Heading>Services and prices</Heading>
              <div className="divide-y divide-line">
                {p.services.map((s, i) => (
                  <div key={i} className="py-3 first:pt-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{s.name}</span>
                      <span className="shrink-0 font-medium">{formatPrice(s.price_pence)}</span>
                    </div>
                    <div className="text-sm text-muted">
                      {[s.duration_minutes ? `${s.duration_minutes} min` : null, deliveryLabel[s.delivery]].filter(Boolean).join(", ")}
                    </div>
                    {s.description && <p className="mt-1 text-sm text-muted whitespace-pre-line">{s.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(p.contact_email || p.phone || p.website) && (
            <section>
              <Heading>Contact</Heading>
              <div className="flex flex-col gap-2">
                {p.contact_email && (
                  <a className="btn" href={`mailto:${p.contact_email}`}>
                    Email {p.display_name.split(" ")[0] || ""}
                  </a>
                )}
                {p.phone && (
                  <a className="btn btn-ghost" href={`tel:${p.phone}`}>
                    Call {p.phone}
                  </a>
                )}
                {p.website && (
                  <a className="btn btn-ghost" href={p.website} target="_blank" rel="noreferrer">
                    Visit website
                  </a>
                )}
              </div>
            </section>
          )}

          {p.qualifications.length > 0 && (
            <section>
              <Heading>Qualifications</Heading>
              <List items={p.qualifications} />
            </section>
          )}

          {p.education.length > 0 && (
            <section>
              <Heading>Education</Heading>
              <List items={p.education} />
            </section>
          )}

          {p.equipment.length > 0 && (
            <section>
              <Heading>Equipment and facilities</Heading>
              <List items={p.equipment} />
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
