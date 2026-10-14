// Transaction filters live in the URL (?q=&from=&to=&category=&account=&type=&page=),
// so "all REWE transactions" is just a link. Shared by server and client.

import { isISODate } from "./dates";
import type { TxClass } from "./summary";

export const PAGE_SIZE = 50;
export const TX_CLASSES: TxClass[] = ["expense", "income", "savings", "transfer"];
/** category=none → uncategorised */
export const NO_CATEGORY = "none";

export type TxFilters = {
  q: string;
  from: string;
  to: string;
  category: string;
  account: string;
  type: TxClass | "";
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(params: Params): TxFilters {
  const from = one(params.from);
  const to = one(params.to);
  const category = one(params.category);
  const account = one(params.account);
  const type = one(params.type);
  const page = Number.parseInt(one(params.page), 10);
  return {
    q: one(params.q).trim().slice(0, 100),
    from: isISODate(from) ? from : "",
    to: isISODate(to) ? to : "",
    category: category === NO_CATEGORY || UUID_RE.test(category) ? category : "",
    account: UUID_RE.test(account) ? account : "",
    type: (TX_CLASSES as string[]).includes(type) ? (type as TxClass) : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** URL query for filters; empty values and page 1 are omitted. */
export function filtersToQuery(filters: Partial<TxFilters>): string {
  const params = new URLSearchParams();
  for (const key of ["q", "from", "to", "category", "account", "type"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function activeFilterCount(f: TxFilters): number {
  return [f.q, f.from || f.to, f.category, f.account, f.type].filter(Boolean).length;
}
