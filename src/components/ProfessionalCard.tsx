import Link from "next/link";
import { deliveryLabel, formatPrice, type Match } from "@/lib/types";

export function ProfessionalCard({ m }: { m: Match }) {
  const location = [m.area, m.city].filter(Boolean).join(", ");
  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">
            <Link href={`/p/${m.id}`} className="hover:underline">
              {m.display_name || "Unnamed professional"}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {[m.profession, location, m.offers_online ? "Online available" : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {m.reason && <p className="mt-3 border-l-2 border-foreground pl-3 text-sm">{m.reason}</p>}
      {m.headline && <p className="mt-3 text-sm">{m.headline}</p>}

      {m.specialties.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
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
