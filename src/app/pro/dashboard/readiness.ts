// Shared rules for when a profile is complete enough to appear in search.
export type ProfileLike = {
  display_name: string;
  profession: string;
  headline: string;
  bio: string;
  approach: string;
  area: string;
  offers_online: boolean;
  contact_email: string;
  phone: string;
  photo_url: string;
  qualifications: string[];
  education: string[];
};

export type CheckItem = { key: string; label: string; done: boolean; required: boolean };

export function checklist(p: ProfileLike, serviceCount: number, pricedCount = serviceCount): CheckItem[] {
  return [
    { key: "basics", label: "Name and profession", done: !!(p.display_name && p.profession), required: true },
    { key: "location", label: "Where you work", done: !!(p.area || p.offers_online), required: true },
    { key: "contact", label: "How clients contact you", done: !!(p.contact_email || p.phone), required: true },
    { key: "services", label: "At least one service", done: serviceCount > 0, required: true },
    { key: "prices", label: "Prices", done: pricedCount > 0, required: false },
    { key: "photo", label: "Photo", done: !!p.photo_url, required: false },
    { key: "about", label: "About you", done: !!p.bio, required: false },
    { key: "approach", label: "Your approach", done: !!p.approach, required: false },
    { key: "qualifications", label: "Qualifications", done: p.qualifications.length > 0, required: false },
    { key: "education", label: "Education", done: p.education.length > 0, required: false },
  ];
}

export function missingRequired(p: ProfileLike, serviceCount: number) {
  return checklist(p, serviceCount)
    .filter((c) => c.required && !c.done)
    .map((c) => c.label.toLowerCase());
}
