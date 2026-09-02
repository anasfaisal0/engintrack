import { fetchJson } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type RcOffer = {
  id: number;
  title: string;
  careers_url?: string;
  careers_apply_url?: string;
  location?: string;
  city?: string;
  country?: string;
  published_at?: string;
  created_at?: string;
  department?: string;
  employment_type_code?: string;
};

/** Recruitee — keyless offers API, whole board in one request. */
export const recruitee = async (s: Source): Promise<RawJob[]> => {
  const token = s.token ?? s.tenant;
  if (!token) throw new Error(`recruitee: ${s.id} has no token`);
  const data = await fetchJson<{ offers?: RcOffer[] }>(`https://${token}.recruitee.com/api/offers/`);
  return (data.offers ?? []).map((o) => ({
    externalId: String(o.id),
    title: o.title ?? "",
    url: o.careers_url ?? o.careers_apply_url ?? `https://${token}.recruitee.com/o/${o.id}`,
    location: o.location ?? ([o.city, o.country].filter(Boolean).join(", ") || null),
    postedAt: o.published_at ?? o.created_at ?? null,
    department: [o.department, o.employment_type_code].filter(Boolean).join(" / ") || null,
  }));
};
