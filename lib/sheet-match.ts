// Matching RSVPs to rows of the Guest List tab. Pure logic: no network or sheet access in this file.

import type { Rsvp } from "./store";

export const NAME_HEADER = "Guest / Party Name";
export const OUR_HEADERS = ["RSVP", "Adults coming", "RSVP name(s)", "Replied"];

type Cell = string | number | boolean | null | undefined;
export type Grid = Cell[][];

export type Guest = {
  r: number; // 0-based row in the Guest List tab
  name: string;
  section: string;
  adults: number;
  kidRow: boolean;
  plus: number;
  capacity: number;
  tokens: string[];
  links: string[]; // names from the "RSVP name(s)" cell
};

export type GuestCols = {
  name: number; adults: number; kids: number; under6: number;
  rsvp: number; coming: number; link: number; replied: number;
};

export type GuestLayout = { headerRows: number[]; cols: GuestCols; guests: Guest[] };

export type Person = {
  key: string;
  replyId: string;
  name: string;
  attending: boolean;
  date: string;
  adults: number;
  kids: number;
  party: string[]; // the other names on the same reply
  transport: boolean | null; // null when the reply didn't answer the question
  superseded?: boolean; // an older reply under the same name; the newest one counts
  repeat?: boolean; // the same name typed again on the same reply: a second adult, still counted
};

const TITLES = ["uncle", "aunty", "auntie", "aunt", "grandma", "grandpa", "nana", "nan", "pop", "dad", "mum", "mom",
  "mr", "mrs", "ms", "miss", "dr", "fr", "father"];

export function norm(s: unknown) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function splitNames(s: unknown) {
  return String(s ?? "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
}
function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
const is = (v: unknown, text: string) => String(v ?? "").trim().toLowerCase() === text.toLowerCase();

/** Turns the Guest List grid into guest rows plus the positions of the columns we use. */
export function parseGuestGrid(grid: Grid): GuestLayout {
  const headerRows: number[] = [];
  let nameCol = -1;
  grid.forEach((row, r) => {
    const c = (row || []).findIndex((v) => is(v, NAME_HEADER));
    if (c >= 0) { headerRows.push(r); if (nameCol < 0) nameCol = c; }
  });
  const cols: GuestCols = { name: nameCol, adults: -1, kids: -1, under6: -1, rsvp: -1, coming: -1, link: -1, replied: -1 };
  const guests: Guest[] = [];
  if (!headerRows.length) return { headerRows, cols, guests };

  const head = grid[headerRows[0]] || [];
  const find = (text: string) => head.findIndex((v) => is(v, text));
  cols.adults = find("Full Paying Adults");
  cols.kids = find("Kids Meals");
  cols.under6 = find("Non-Paying (<6)");
  cols.rsvp = find(OUR_HEADERS[0]);
  cols.coming = find(OUR_HEADERS[1]);
  cols.link = find(OUR_HEADERS[2]);
  cols.replied = find(OUR_HEADERS[3]);

  for (const h of headerRows) {
    const section = h > 0 ? String((grid[h - 1] || [])[nameCol] ?? "").trim() : "";
    for (let r = h + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const raw = String(row[nameCol] ?? "").trim();
      if (!raw || /subtotal|grand total|^total/i.test(raw) || is(raw, NAME_HEADER)) break;
      const plus = /\+\s*(\d+)/.exec(raw);
      const adults = cols.adults >= 0 ? num(row[cols.adults]) : 1;
      const kids = (cols.kids >= 0 ? num(row[cols.kids]) : 0) + (cols.under6 >= 0 ? num(row[cols.under6]) : 0);
      guests.push({
        r, name: raw, section, adults,
        kidRow: adults === 0 && kids > 0,
        plus: plus ? Number(plus[1]) : 0,
        capacity: Math.max(1, adults, plus ? 1 + Number(plus[1]) : 0),
        tokens: norm(raw.replace(/\+\s*\d+.*$/, "")).split(" ").filter((t) => t && !TITLES.includes(t)),
        links: cols.link >= 0 ? splitNames(row[cols.link]) : [],
      });
    }
  }
  return { headerRows, cols, guests };
}

/** One entry per named person, newest reply first. Older replies under the same name are marked superseded. */
export function flattenPeople(rsvps: Rsvp[]): Person[] {
  const people: Person[] = [];
  for (const r of rsvps) {
    const names = (r.names || []).map((n) => String(n).trim()).filter(Boolean);
    for (const name of names) {
      people.push({
        key: `${r.id}|${norm(name)}`, replyId: r.id, name, attending: r.attending === true,
        date: r.createdAt, adults: num(r.adults), kids: r.attending === true ? num(r.kids) : 0,
        party: names.filter((n) => n !== name),
        transport: r.attending === true && typeof r.transport === "boolean" ? r.transport : null,
      });
    }
  }
  return markSuperseded(people);
}

/** Keys of the people already listed on the RSVPs tab (rows as written by buildRsvpRows). */
export function seenKeys(rows: Grid) {
  const seen = new Set<string>();
  for (const row of rows) {
    const name = String((row || [])[1] ?? "").trim();
    if (name) seen.add(`${String(row[8] ?? "")}|${norm(name)}`);
  }
  return seen;
}

function markSuperseded(people: Person[]) {
  people.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latest = new Map<string, string>(); // name → the newest reply it appears on
  for (const p of people) {
    const n = norm(p.name);
    const reply = latest.get(n);
    // Only a different, older reply is superseded. The same name twice on one reply is two adults.
    p.superseded = reply !== undefined && reply !== p.replyId;
    p.repeat = reply === p.replyId;
    if (reply === undefined) latest.set(n, p.replyId);
  }
  return people;
}

const shortFor = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

/** True when the two words differ by a single changed, missing or extra letter. */
function oneLetterOut(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const rest = (x: string, n: number) => x.slice(n);
  return rest(a, i + 1) === rest(b, i + 1) || rest(a, i) === rest(b, i + 1) || rest(a, i + 1) === rest(b, i);
}

/**
 * Guest rows a person could be, best matches only.
 * A guest written as a full name needs first and last name to agree; a first-name-only guest matches on first name.
 */
export function candidates(guests: Guest[], name: string, anyCapacity: boolean) {
  const p = norm(name).split(" ").filter(Boolean);
  if (!p.length) return [];
  let best = 0;
  let out: Guest[] = [];
  for (const g of guests) {
    if (g.kidRow || !g.tokens.length) continue;
    if (!anyCapacity && g.links.length >= g.capacity) continue;
    const t = g.tokens;
    let score = 0;
    if (t.length >= 2) {
      if (p.length >= 2) {
        const first = t[0], last = t[t.length - 1], pFirst = p[0], pLast = p[p.length - 1];
        if (first === pFirst && last === pLast) score = 3;
        // Near enough: a short form of the first name (Zach / Zachariah) and a surname at most one letter out.
        else if (shortFor(first, pFirst) && (last === pLast || (Math.min(last.length, pLast.length) >= 5 && oneLetterOut(last, pLast)))) score = 2.5;
      }
    } else if (t[0] === p[0]) {
      score = p.length === 1 ? 2 : 1;
    }
    if (!score) continue;
    if (score > best) { best = score; out = [g]; } else if (score === best) out.push(g);
  }
  return out;
}

/**
 * Links people who have just replied to a guest row when there is exactly one sensible match.
 * Never touches people who were already on the RSVPs tab, so a link removed by hand stays removed.
 * Returns the guest rows whose links changed.
 */
export function autoLink(guests: Guest[], people: Person[], seen: Set<string>) {
  const linked = new Set<string>();
  for (const g of guests) for (const n of g.links) linked.add(norm(n));
  const changed = new Set<Guest>();
  const link = (g: Guest, p: Person) => { g.links.push(p.name); linked.add(norm(p.name)); changed.add(g); };

  const fresh = people.filter((p) => !seen.has(p.key) && !p.superseded)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const unplaced: Person[] = [];
  for (const p of fresh) {
    if (linked.has(norm(p.name))) continue;
    const c = candidates(guests, p.name, false);
    if (c.length === 1) link(c[0], p); else unplaced.push(p);
  }

  // A "+ 1" guest's partner: no match of their own, but they replied together with someone on a "+ 1" row.
  for (const p of unplaced) {
    if (linked.has(norm(p.name)) || candidates(guests, p.name, true).length) continue;
    const mates = p.party.map(norm);
    const host = guests.find((g) => g.plus > 0 && g.links.length < g.capacity && g.links.some((n) => mates.includes(norm(n))));
    if (host) link(host, p);
  }
  return Array.from(changed);
}

export type GuestResult = { r: number; status: string; coming: number | ""; replied: string };
export type PersonResult = Person & { match: string; note: string; matched: boolean };
export type Summary = { replied: number; attending: number; declined: number; kids: number; unmatched: number; awaiting: number; transport: number };

/** Works out what to show for every guest row and every person who replied. */
export function compute(guests: Guest[], people: Person[]): { guests: GuestResult[]; people: PersonResult[]; summary: Summary } {
  const latest = new Map<string, Person>();
  for (const p of people) if (!p.superseded) latest.set(norm(p.name), p);
  const owner = new Map<string, Guest>();
  for (const g of guests) for (const n of g.links) if (!owner.has(norm(n))) owner.set(norm(n), g);

  const guestOut = guests.map((g): GuestResult => {
    if (!g.links.length) return { r: g.r, status: "", coming: "", replied: "" };
    const found = g.links.map((n) => latest.get(norm(n))).filter((p): p is Person => Boolean(p));
    if (!found.length) return { r: g.r, status: "Check name", coming: "", replied: "" };
    const yes = found.filter((p) => p.attending).length;
    let status = yes === found.length ? "Attending" : yes === 0 ? "Declined" : "Part attending";
    if (found.length < g.links.length) status += " (check name)";
    const replied = found.map((p) => String(p.date)).sort().pop() || "";
    return { r: g.r, status, coming: yes, replied };
  });

  const peopleOut = people.map((p): PersonResult => {
    const g = owner.get(norm(p.name));
    let match = "";
    let note = "";
    if (p.superseded) {
      note = "Earlier reply from the same name. The newer one counts.";
      match = g ? g.name : "";
    } else if (p.repeat) {
      note = "Same name entered twice on this reply. Counted as a second adult.";
      match = g ? g.name : "NOT MATCHED";
    } else if (g) {
      match = g.name;
      if (g.links.length > Math.max(1, g.adults)) note = "More names than this guest's invite";
    } else {
      match = "NOT MATCHED";
      const c = candidates(guests, p.name, true);
      const hosts = p.party.map((n) => owner.get(norm(n))).filter((x): x is Guest => Boolean(x));
      if (c.length) note = "Could be: " + c.map((x) => `${x.name} (row ${x.r + 1})`).join(", ");
      else if (hosts.length) note = `Not on the guest list. Replied with ${hosts[0].name} (row ${hosts[0].r + 1})`;
      else note = "Not on the guest list";
    }
    return { ...p, match, note, matched: Boolean(g) };
  });

  const current = people.filter((p) => !p.superseded);
  const kidsByReply = new Map<string, number>();
  for (const p of current) if (p.attending) kidsByReply.set(p.replyId, p.kids);
  // People needing transport: the adults who said yes, plus the children on those replies.
  let transport = current.filter((p) => p.attending && p.transport).length;
  const counted = new Set<string>();
  for (const p of current) if (p.attending && p.transport && !counted.has(p.replyId)) { counted.add(p.replyId); transport += p.kids; }
  let kids = 0;
  for (const k of kidsByReply.values()) kids += k;

  return {
    guests: guestOut,
    people: peopleOut,
    summary: {
      replied: current.length,
      attending: current.filter((p) => p.attending).length,
      declined: current.filter((p) => !p.attending).length,
      kids,
      unmatched: current.filter((p) => !owner.get(norm(p.name))).length,
      awaiting: guests.filter((g) => g.adults > 0 && !g.kidRow && !g.links.length).length,
      transport,
    },
  };
}
