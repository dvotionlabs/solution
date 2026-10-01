"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { createClient } from "@/lib/supabase/client";
import { deliveryLabel, formatPrice, type Match, type Service } from "@/lib/types";
import { deleteService, saveProfile, saveService, setPhoto, setPublished, type SaveState } from "./actions";
import { checklist } from "./readiness";

export type Pro = {
  id: string;
  display_name: string;
  profession: string;
  headline: string;
  bio: string;
  years_experience: number | null;
  qualifications: string[];
  specialties: string[];
  area: string;
  city: string;
  postcode: string;
  offers_online: boolean;
  website: string;
  contact_email: string;
  phone: string;
  photo_url: string;
  published: boolean;
};

export type ServiceRow = Service & { id: string };

type Draft = Omit<Pro, "id" | "published" | "photo_url">;

function draftFromForm(form: HTMLFormElement): Draft {
  const f = new FormData(form);
  const s = (k: string) => String(f.get(k) ?? "");
  const years = s("years_experience").trim();
  return {
    display_name: s("display_name").trim(),
    profession: s("profession").trim(),
    headline: s("headline").trim(),
    bio: s("bio").trim(),
    years_experience: years ? parseInt(years, 10) || 0 : null,
    qualifications: s("qualifications").split("\n").map((x) => x.trim()).filter(Boolean),
    specialties: s("specialties").split(",").map((x) => x.trim()).filter(Boolean),
    area: s("area").trim(),
    city: s("city").trim() || "London",
    postcode: s("postcode").trim(),
    offers_online: f.get("offers_online") === "on",
    website: s("website").trim(),
    contact_email: s("contact_email").trim(),
    phone: s("phone").trim(),
  };
}

function Field(props: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  textarea?: boolean;
  rows?: number;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  const { name, label, defaultValue, textarea, rows, type = "text", placeholder, hint } = props;
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {textarea ? (
        <textarea
          className="input"
          rows={rows ?? 4}
          id={name}
          name={name}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="input"
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
        />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ---------- Checklist and visibility ---------- */

function Checklist({ pro, serviceCount }: { pro: Pro; serviceCount: number }) {
  const items = checklist(pro, serviceCount);
  const ready = items.filter((i) => i.required).every((i) => i.done);
  const [state, setState] = useState<SaveState>({});
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => setState(await setPublished(!pro.published)));
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{pro.published ? "You are visible in search" : "You are hidden from search"}</h2>
          <p className="mt-1 text-sm text-muted">
            {items.filter((i) => i.done).length} of {items.length} complete
          </p>
        </div>
        <button
          className={`btn ${pro.published ? "btn-ghost" : ""}`}
          disabled={pending || (!pro.published && !ready)}
          onClick={toggle}
        >
          {pending ? "Saving…" : pro.published ? "Hide from search" : "Show me in search"}
        </button>
      </div>
      <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                i.done ? "border-foreground bg-foreground text-background" : "border-line"
              }`}
            >
              {i.done ? "✓" : ""}
            </span>
            <span className={i.done ? "" : "text-muted"}>
              {i.label}
              {!i.required && <span className="text-muted"> (optional)</span>}
            </span>
          </li>
        ))}
      </ul>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
    </section>
  );
}

/* ---------- Photo ---------- */

function PhotoSection({ pro, onChange }: { pro: Pro; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) return setError("Please use an image under 5 MB.");
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${pro.id}/photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const url = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      await setPhoto(url);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Photo">
      <div className="flex items-center gap-4">
        {pro.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pro.photo_url} alt="" className="h-20 w-20 rounded-md object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-md border border-dashed border-line" />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : pro.photo_url ? "Change photo" : "Upload photo"}
          </button>
          {pro.photo_url && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={async () => {
                await setPhoto("");
                onChange("");
              }}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Section>
  );
}

/* ---------- Services ---------- */

function ServiceForm({ service, onDone }: { service?: ServiceRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveService, {});
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (state.saved) done.current();
  }, [state]);

  return (
    <form action={action} className="space-y-4 rounded-md border border-line p-4">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Service name" defaultValue={service?.name} placeholder="e.g. 1:1 PT session" />
        <div>
          <label className="label" htmlFor={`delivery-${service?.id ?? "new"}`}>Delivery</label>
          <select
            className="input"
            id={`delivery-${service?.id ?? "new"}`}
            name="delivery"
            defaultValue={service?.delivery ?? "in_person"}
          >
            <option value="in_person">In person</option>
            <option value="online">Online</option>
            <option value="both">In person or online</option>
          </select>
        </div>
      </div>
      <Field name="description" label="Description" textarea rows={3} defaultValue={service?.description} />
      <div className="grid gap-4 grid-cols-2">
        <Field
          name="price"
          label="Price (£)"
          type="number"
          defaultValue={service?.price_pence != null ? service.price_pence / 100 : ""}
        />
        <Field name="duration" label="Duration (minutes)" type="number" defaultValue={service?.duration_minutes} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : service ? "Save service" : "Add service"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ServicesSection({ services }: { services: ServiceRow[] }) {
  const [editing, setEditing] = useState<string | null>(services.length === 0 ? "new" : null);
  const [, start] = useTransition();

  return (
    <Section title="Services">
      {services.map((s) =>
        editing === s.id ? (
          <ServiceForm key={s.id} service={s} onDone={() => setEditing(null)} />
        ) : (
          <div key={s.id} className="flex items-start justify-between gap-4 rounded-md border border-line p-4">
            <div className="min-w-0">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted">
                {[formatPrice(s.price_pence), s.duration_minutes ? `${s.duration_minutes} min` : null, deliveryLabel[s.delivery]]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {s.description && <p className="mt-1 text-sm text-muted whitespace-pre-line">{s.description}</p>}
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button className="underline" onClick={() => setEditing(s.id)}>Edit</button>
              <button
                className="text-muted hover:text-foreground"
                onClick={() => {
                  if (confirm(`Remove "${s.name}"?`)) start(() => deleteService(s.id));
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <ServiceForm onDone={() => setEditing(null)} />
      ) : (
        <button className="btn btn-ghost" onClick={() => setEditing("new")}>
          Add a service
        </button>
      )}
    </Section>
  );
}

/* ---------- Editor ---------- */

export function Editor({ pro, services }: { pro: Pro; services: ServiceRow[] }) {
  const [draft, setDraft] = useState<Draft>(pro);
  const [photo, setPhotoUrl] = useState(pro.photo_url);
  const [editedAt, setEditedAt] = useState(0);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProfile, {});
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = editedAt > (state.at ?? 0);

  const preview: Match = {
    ...draft,
    id: pro.id,
    photo_url: photo,
    services,
    rank: 0,
    reason: null,
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Checklist pro={{ ...pro, photo_url: photo }} serviceCount={services.length} />
        <PhotoSection pro={{ ...pro, photo_url: photo }} onChange={setPhotoUrl} />

        <form
          ref={formRef}
          action={action}
          onInput={() => {
            setEditedAt(Date.now());
            if (formRef.current) setDraft(draftFromForm(formRef.current));
          }}
          className="space-y-6"
        >
          <Section title="About you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="display_name" label="Name" defaultValue={pro.display_name} />
              <Field name="profession" label="Profession" defaultValue={pro.profession} placeholder="e.g. Personal trainer" />
            </div>
            <Field name="headline" label="Headline" defaultValue={pro.headline} hint="One line shown at the top of your card." />
            <Field name="bio" label="About you" textarea rows={6} defaultValue={pro.bio} />
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field name="years_experience" label="Years experience" type="number" defaultValue={pro.years_experience} />
              <Field
                name="specialties"
                label="Specialties"
                defaultValue={pro.specialties.join(", ")}
                hint="Separate with commas."
              />
            </div>
            <Field
              name="qualifications"
              label="Qualifications"
              textarea
              rows={4}
              defaultValue={pro.qualifications.join("\n")}
              hint="One per line."
            />
          </Section>

          <Section title="Where you work">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="area" label="Area" defaultValue={pro.area} placeholder="e.g. Liverpool Street" />
              <Field name="city" label="City" defaultValue={pro.city} />
              <Field name="postcode" label="Postcode" defaultValue={pro.postcode} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="offers_online" defaultChecked={pro.offers_online} /> I also work online
            </label>
          </Section>

          <Section title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="contact_email" label="Email" type="email" defaultValue={pro.contact_email} />
              <Field name="phone" label="Phone" type="tel" defaultValue={pro.phone} />
            </div>
            <Field name="website" label="Website" defaultValue={pro.website} />
          </Section>

          <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-background/95 px-4 py-3 backdrop-blur">
            <button className="btn" disabled={pending || !dirty}>
              {pending ? "Saving…" : "Save changes"}
            </button>
            <span className="text-sm text-muted">
              {state.error ? <span className="text-red-600">{state.error}</span> : dirty ? "Unsaved changes" : state.saved ? "All changes saved" : ""}
            </span>
          </div>
        </form>

        <ServicesSection services={services} />
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="label">How clients see you</div>
        <ProfessionalCard m={preview} linkName={false} />
      </aside>
    </div>
  );
}
