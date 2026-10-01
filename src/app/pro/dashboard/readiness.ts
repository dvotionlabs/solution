// Shared rules for when a profile is complete enough to appear in search.
export type ProfileLike = {
  display_name: string;
  profession: string;
  headline: string;
  bio: string;
  area: string;
  offers_online: boolean;
  contact_email: string;
  phone: string;
  photo_url: string;
  qualifications: string[];
};

export type CheckItem = { key: string; label: string; done: boolean; required: boolean };

export function checklist(p: ProfileLike, serviceCount: number): CheckItem[] {
  return [
    { key: "basics", label: "Name and profession", done: !!(p.display_name && p.profession), required: true },
    { key: "location", label: "Where you work", done: !!(p.area || p.offers_online), required: true },
    { key: "contact", label: "How clients contact you", done: !!(p.contact_email || p.phone), required: true },
    { key: "services", label: "At least one service", done: serviceCount > 0, required: true },
    { key: "photo", label: "Profile photo", done: !!p.photo_url, required: false },
    { key: "about", label: "Headline and about you", done: !!(p.headline && p.bio), required: false },
    { key: "qualifications", label: "Qualifications", done: p.qualifications.length > 0, required: false },
  ];
}

export function missingRequired(p: ProfileLike, serviceCount: number) {
  return checklist(p, serviceCount)
    .filter((c) => c.required && !c.done)
    .map((c) => c.label.toLowerCase());
}
