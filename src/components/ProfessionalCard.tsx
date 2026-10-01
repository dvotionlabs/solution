import Link from "next/link";
import { deliveryLabel, formatPrice, type Match } from "@/lib/types";

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function Avatar({ name, url, size = 72 }: { name: string; url: string; size?: number }) {
  const style = { width: size, height: size };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={style} className="shrink-0 rounded-lg object-cover" />
  ) : (
    <div
      style={style}
      className="serif flex shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xl font-semibold text-accent"
    >
      {initials(name)}
    </div>
  );
}

export function Meta({ items }: { items: (string | null | false | undefined)[] }) {
  const shown = items.filter(Boolean) as string[];
  if (!shown.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted">
      {shown.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  );
}

// A search result. Everything a client needs to compare is visible without clicking.
export function ProfessionalCard({ m }: { m: Match }) {
  const location = [m.area, m.city].filter(Boolean).join(", ");

  return (
    <article className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar name={m.display_name} url={m.photo_url} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.4rem] font-semibold leading-tight">
            <Link href={`/p/${m.id}`} className="hover:underline">
              {m.display_name || "Unnamed professional"}
            </Link>
          </h3>
          <p className="mt-0.5">
            {m.profession}
            {location && <span className="text-muted">, {location}</span>}
          </p>
          <div className="mt-1">
            <Meta
              items={[
                m.years_experience != null && `${m.years_experience} years experience`,
                m.offers_online && "Online available",
                m.is_sample && "Sample profile",
              ]}
            />
          </div>
        </div>
      </div>

      {m.reason && (
        <p className="mt-5 rounded-lg bg-accent-soft px-4 py-3 text-[0.95rem] leading-relaxed">{m.reason}</p>
      )}

      {m.headline && <p className="mt-4 leading-relaxed">{m.headline}</p>}

      {m.specialties.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {m.specialties.map((s) => (
            <span key={s} className="tag">{s}</span>
          ))}
        </div>
      )}

      {m.services.length > 0 && (
        <div className="mt-5 divide-y divide-line border-y border-line">
          {m.services.map((s, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 text-sm text-muted">
                  {[s.duration_minutes ? `${s.duration_minutes} min` : null, deliveryLabel[s.delivery]].filter(Boolean).join(", ")}
                </span>
              </div>
              <span className="shrink-0 font-medium">{formatPrice(s.price_pence)}</span>
            </div>
          ))}
        </div>
      )}

      {m.qualifications.length > 0 && (
        <p className="mt-4 text-sm">
          <span className="text-muted">Qualifications: </span>
          {m.qualifications.join("; ")}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/p/${m.id}`} className="btn">
          View full profile
        </Link>
        {m.contact_email && (
          <a className="btn btn-ghost" href={`mailto:${m.contact_email}`}>
            Email
          </a>
        )}
        {m.phone && (
          <a className="btn btn-ghost" href={`tel:${m.phone}`}>
            Call
          </a>
        )}
      </div>
    </article>
  );
}
