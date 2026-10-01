"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveProfile, addService, type SaveState } from "./actions";

type Pro = {
  display_name: string;
  profession: string;
  headline: string;
  bio: string;
  area: string;
  city: string;
  postcode: string;
  offers_online: boolean;
  specialties: string[];
  website: string;
  contact_email: string;
  phone: string;
  published: boolean;
};

function Field({
  name,
  label,
  defaultValue,
  textarea,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  textarea?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {textarea ? (
        <textarea className="input min-h-28" id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} />
      ) : (
        <input className="input" id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
      )}
    </div>
  );
}

export function ProfileForm({ pro }: { pro: Pro }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProfile, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="display_name" label="Name" defaultValue={pro.display_name} />
        <Field name="profession" label="Profession" defaultValue={pro.profession} placeholder="e.g. Personal trainer" />
      </div>
      <Field name="headline" label="Headline" defaultValue={pro.headline} />
      <Field name="bio" label="About you" defaultValue={pro.bio} textarea />
      <Field
        name="specialties"
        label="Specialties (comma separated)"
        defaultValue={pro.specialties.join(", ")}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="area" label="Area" defaultValue={pro.area} placeholder="e.g. Liverpool Street" />
        <Field name="city" label="City" defaultValue={pro.city} />
        <Field name="postcode" label="Postcode" defaultValue={pro.postcode} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="contact_email" label="Contact email" type="email" defaultValue={pro.contact_email} />
        <Field name="phone" label="Phone" type="tel" defaultValue={pro.phone} />
        <Field name="website" label="Website" defaultValue={pro.website} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="offers_online" defaultChecked={pro.offers_online} /> I also work online
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={pro.published} /> Show my profile in search
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.saved && !pending && <p className="text-sm">Saved.</p>}
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}

export function AddServiceForm() {
  const [state, action, pending] = useActionState<SaveState, FormData>(addService, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-lg border border-line p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Service name" placeholder="e.g. 1:1 PT session" />
        <div>
          <label className="label" htmlFor="delivery">Delivery</label>
          <select className="input" id="delivery" name="delivery" defaultValue="in_person">
            <option value="in_person">In person</option>
            <option value="online">Online</option>
            <option value="both">In person or online</option>
          </select>
        </div>
      </div>
      <Field name="description" label="Description" textarea />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="price" label="Price (£)" type="number" />
        <Field name="duration" label="Duration (minutes)" type="number" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Adding…" : "Add service"}</button>
    </form>
  );
}
