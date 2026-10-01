"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ProfileView, type ProfileData } from "@/components/ProfileView";
import { createClient } from "@/lib/supabase/client";
import { deliveryLabel, formatPrice, type Service } from "@/lib/types";
import {
  buildFromNotes,
  deleteService,
  removeExtraSection,
  saveProfile,
  saveService,
  setPhoto,
  setPublished,
  type SaveState,
} from "./actions";
import { checklist } from "./readiness";

export type Pro = Omit<ProfileData, "services"> & {
  postcode: string;
  published: boolean;
  followups: string[];
};

export type ServiceRow = Service & { id: string };

/* ---------- Small building blocks ---------- */

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
  const id = `f-${name}`;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea className="input" rows={rows ?? 4} id={id} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
      ) : (
        <input className="input" id={id} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      {title && <h2 className="mb-3 font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

/* ---------- The AI box ---------- */

function AiBox({ hasProfile, followups }: { hasProfile: boolean; followups: string[] }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(buildFromNotes, {});
  const [text, setText] = useState("");
  const [lastAt, setLastAt] = useState<number | undefined>(undefined);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Clear the box once the profile has been rebuilt from it.
  if (state.saved && state.at !== lastAt) {
    setLastAt(state.at);
    setText("");
  }

  function answer(q: string) {
    setText((t) => `${t ? `${t}\n\n` : ""}${q}\n`);
    ref.current?.focus();
  }

  return (
    <Panel>
      <form action={action} className="space-y-3">
        <label htmlFor="message" className="block">
          <span className="font-semibold">{hasProfile ? "Add or change something" : "Build your profile"}</span>
          <span className="mt-1 block text-sm text-muted">
            {hasProfile
              ? "Write anything you want to add, update or remove, in your own words, and your profile will be updated."
              : "Add any information relevant to you: your qualifications, prices, packages if applicable, experience, philosophy, equipment, location, education, anything you would like displayed on your profile. The more complete it is, the better you appear in searches."}
          </span>
        </label>
        <textarea
          ref={ref}
          id="message"
          name="message"
          className="input"
          rows={hasProfile ? 5 : 14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={hasProfile ? "e.g. I now also offer online programming at £80 a month." : ""}
        />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" disabled={pending || !text.trim()}>
            {pending ? "Working on it…" : hasProfile ? "Update my profile" : "Build my profile"}
          </button>
          {pending && <span className="text-sm text-muted">This usually takes 10 to 30 seconds.</span>}
        </div>
      </form>

      {hasProfile && followups.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="label">Worth adding</div>
          <ul className="space-y-2">
            {followups.map((q) => (
              <li key={q}>
                <button type="button" className="text-left text-sm underline-offset-2 hover:underline" onClick={() => answer(q)}>
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ---------- Visibility and checklist ---------- */

function Visibility({ pro, services }: { pro: Pro; services: ServiceRow[] }) {
  const items = checklist(pro, services.length, services.filter((s) => s.price_pence != null).length);
  const ready = items.filter((i) => i.required).every((i) => i.done);
  const [state, setState] = useState<SaveState>({});
  const [pending, start] = useTransition();

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{pro.published ? "Visible in search" : "Hidden from search"}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {items.filter((i) => i.done).length} of {items.length} complete
          </p>
        </div>
        <button
          className={`btn ${pro.published ? "btn-ghost" : ""}`}
          disabled={pending || (!pro.published && !ready)}
          onClick={() => start(async () => setState(await setPublished(!pro.published)))}
        >
          {pending ? "Saving…" : pro.published ? "Hide from search" : "Show me in search"}
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-1.5 text-sm">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                i.done ? "border-foreground bg-foreground text-background" : "border-line"
              }`}
            >
              {i.done ? "✓" : ""}
            </span>
            <span className={i.done ? "" : "text-muted"}>
              {i.label}
              {i.required && !i.done && <span className="text-muted"> *</span>}
            </span>
          </li>
        ))}
      </ul>
      {!ready && !pro.published && <p className="mt-3 text-xs text-muted">* needed before you can appear in search</p>}
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
    </Panel>
  );
}

/* ---------- Photo ---------- */

function PhotoPanel({ pro }: { pro: Pro }) {
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
      await setPhoto(supabase.storage.from("photos").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <div className="flex items-center gap-4">
        {pro.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pro.photo_url} alt="" className="h-14 w-14 rounded-md object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-md border border-dashed border-line" />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : pro.photo_url ? "Change photo" : "Add a photo"}
          </button>
          {pro.photo_url && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setPhoto("")}>
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
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Panel>
  );
}

/* ---------- Manual editing ---------- */

function ServiceForm({ service, onDone }: { service?: ServiceRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveService, {});
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (state.saved) done.current();
  }, [state]);
  const sid = service?.id ?? "new";

  return (
    <form action={action} className="space-y-4 rounded-md border border-line p-4">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Service name" defaultValue={service?.name} />
        <div>
          <label className="label" htmlFor={`delivery-${sid}`}>Delivery</label>
          <select className="input" id={`delivery-${sid}`} name="delivery" defaultValue={service?.delivery ?? "in_person"}>
            <option value="in_person">In person</option>
            <option value="online">Online</option>
            <option value="both">In person or online</option>
          </select>
        </div>
      </div>
      <Field name="description" label="Description" textarea rows={3} defaultValue={service?.description} />
      <div className="grid grid-cols-2 gap-4">
        <Field name="price" label="Price (£)" type="number" defaultValue={service?.price_pence != null ? service.price_pence / 100 : ""} />
        <Field name="duration" label="Duration (minutes)" type="number" defaultValue={service?.duration_minutes} />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn" disabled={pending}>{pending ? "Saving…" : service ? "Save service" : "Add service"}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

function ServicesEditor({ services }: { services: ServiceRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <div className="space-y-2">
      {services.map((s) =>
        editing === s.id ? (
          <ServiceForm key={s.id} service={s} onDone={() => setEditing(null)} />
        ) : (
          <div key={s.id} className="flex items-start justify-between gap-4 rounded-md border border-line p-3">
            <div className="min-w-0">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted">
                {[formatPrice(s.price_pence), s.duration_minutes ? `${s.duration_minutes} min` : null, deliveryLabel[s.delivery]]
                  .filter(Boolean)
                  .join(", ")}
              </div>
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
        <button className="btn btn-ghost" onClick={() => setEditing("new")}>Add a service</button>
      )}
    </div>
  );
}

function ManualEditor({ pro, services, onClose }: { pro: Pro; services: ServiceRow[]; onClose: () => void }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProfile, {});
  const [, start] = useTransition();

  return (
    <div className="space-y-6 rounded-xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Edit details</h2>
        <button className="btn btn-ghost" onClick={onClose}>Done</button>
      </div>
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="display_name" label="Name" defaultValue={pro.display_name} />
          <Field name="profession" label="Profession" defaultValue={pro.profession} />
        </div>
        <Field name="headline" label="Headline" defaultValue={pro.headline} />
        <Field name="bio" label="About" textarea rows={7} defaultValue={pro.bio} />
        <Field name="approach" label="Approach" textarea rows={5} defaultValue={pro.approach} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="qualifications" label="Qualifications" textarea defaultValue={pro.qualifications.join("\n")} hint="One per line." />
          <Field name="education" label="Education" textarea defaultValue={pro.education.join("\n")} hint="One per line." />
          <Field name="specialties" label="Specialties" textarea defaultValue={pro.specialties.join("\n")} hint="One per line." />
          <Field name="equipment" label="Equipment and facilities" textarea defaultValue={pro.equipment.join("\n")} hint="One per line." />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field name="years_experience" label="Years experience" type="number" defaultValue={pro.years_experience} />
          <Field name="area" label="Area" defaultValue={pro.area} />
          <Field name="city" label="City" defaultValue={pro.city} />
          <Field name="postcode" label="Postcode" defaultValue={pro.postcode} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="offers_online" defaultChecked={pro.offers_online} /> I also work online
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="contact_email" label="Email" type="email" defaultValue={pro.contact_email} />
          <Field name="phone" label="Phone" type="tel" defaultValue={pro.phone} />
          <Field name="website" label="Website" defaultValue={pro.website} />
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <div className="flex items-center gap-3">
          <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save details"}</button>
          {state.saved && !pending && <span className="text-sm text-muted">Saved</span>}
        </div>
      </form>

      <div className="border-t border-line pt-5">
        <h3 className="label">Services and prices</h3>
        <ServicesEditor services={services} />
      </div>

      {pro.extra_sections.length > 0 && (
        <div className="border-t border-line pt-5">
          <h3 className="label">Other sections</h3>
          <ul className="space-y-2">
            {pro.extra_sections.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-4 rounded-md border border-line p-3 text-sm">
                <span className="font-medium">{e.title}</span>
                <button className="text-muted hover:text-foreground" onClick={() => start(() => removeExtraSection(i))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">To change the wording of these, describe the change in the box.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Dashboard ---------- */

export function Dashboard({ pro, services }: { pro: Pro; services: ServiceRow[] }) {
  const [editing, setEditing] = useState(false);
  const hasProfile = Boolean(pro.profession || pro.bio || services.length);
  const view: ProfileData = { ...pro, services };

  if (!hasProfile) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AiBox hasProfile={false} followups={[]} />
        <PhotoPanel pro={pro} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Visibility pro={pro} services={services} />
        <AiBox hasProfile followups={pro.followups} />
        <PhotoPanel pro={pro} />
      </div>
      <div>
        {editing ? (
          <ManualEditor pro={pro} services={services} onClose={() => setEditing(false)} />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">How clients see you</span>
              <button className="text-sm underline" onClick={() => setEditing(true)}>Edit details yourself</button>
            </div>
            <ProfileView p={view} />
          </>
        )}
      </div>
    </div>
  );
}
