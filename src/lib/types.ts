export type Service = {
  name: string;
  description: string;
  price_pence: number | null;
  duration_minutes: number | null;
  delivery: "in_person" | "online" | "both";
};

export type Candidate = {
  id: string;
  display_name: string;
  profession: string;
  headline: string;
  bio: string;
  approach: string;
  area: string;
  city: string;
  offers_online: boolean;
  specialties: string[];
  qualifications: string[];
  education: string[];
  equipment: string[];
  extra_sections: { title: string; body: string }[];
  years_experience: number | null;
  photo_url: string;
  website: string;
  contact_email: string;
  phone: string;
  services: Service[];
  rank: number;
};

export type Match = Candidate & { reason: string | null };

export function formatPrice(pence: number | null) {
  if (pence == null) return "Price on request";
  return `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`;
}

export const deliveryLabel: Record<Service["delivery"], string> = {
  in_person: "In person",
  online: "Online",
  both: "In person or online",
};
