import Link from "next/link";
import { deliveryLabel, formatPrice, type Match } from "@/lib/types";

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

export function ProfessionalCard({ m, linkName = true }: { m: Match; linkName?: boolean }) {
  const location = [m.area, m.city].filter(Boolean).join(", ");
  const meta = [
    m.profession,
    location,
    m.years_experience != null ? `${m.years_experience} yrs experience` : null,
    m.offers_online ? "Online available" : null,
  ].filter(Boolean);
  const name = m.display_name || "Your name";

  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start gap-4">
        {m.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-line text-lg font-medium text-muted">
            {initials(m.display_name)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">
            {linkName ? (
              <Link href={`/p/${m.id}`} className="hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </h3>
          <p className="mt-1 text-sm text-muted">{meta.join(" · ")}</p>
        </div>
      </div>

      {m.reason && <p className="mt-4 border-l-2 border-foreground pl-3 text-sm">{m.reason}</p>}
      {m.headline && <p className="mt-4 text-sm">{m.headline}</p>}

      {m.qualifications.length > 0 && (
        <div className="mt-4">
          <div className="label">Qualifications</div>
          <ul className="text-sm">
            {m.qualifications.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {m.specialties.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {m.specialties.map((s) => (
            <li key={s} className="rounded border border-line px-2 py-0.5 text-xs text-muted">
              {s}
            </li>
          ))}
        </ul>
      )}

      {m.services.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <tbody>
            {m.services.map((s, i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-2 pr-2">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted">
                    {[s.duration_minutes ? `${s.duration_minutes} min` : null, deliveryLabel[s.delivery]]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="py-2 text-right font-mono whitespace-nowrap">{formatPrice(s.price_pence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {m.contact_email && (
          <a className="underline" href={`mailto:${m.contact_email}`}>
            {m.contact_email}
          </a>
        )}
        {m.phone && (
          <a className="underline" href={`tel:${m.phone}`}>
            {m.phone}
          </a>
        )}
        {m.website && (
          <a className="underline" href={m.website} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
      </div>
    </article>
  );
}
