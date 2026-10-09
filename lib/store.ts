import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";

export type Rsvp = {
  id: string;
  createdAt: string;
  attending: boolean;
  adults: number;
  kids: number;
  names: string[];
  /** Needs the transport from the church to the reception. Absent on declines and on replies sent before the question existed. */
  transport?: boolean;
};

const KEY = "rsvps";

// Vercel's Upstash integration sets KV_* ; a direct Upstash setup sets UPSTASH_* .
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// Local development fallback: a JSON file (never used on Vercel once Redis is connected).
const FILE = path.join(process.cwd(), "data", "rsvps.json");
async function readFile(): Promise<Rsvp[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}
async function writeFile(list: Rsvp[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2));
}

export function storageReady() {
  return Boolean(redis) || process.env.NODE_ENV !== "production" || process.env.LOCAL_FILE_STORE === "1";
}

export async function addRsvp(r: Rsvp) {
  if (redis) {
    await redis.hset(KEY, { [r.id]: JSON.stringify(r) });
    return;
  }
  const list = await readFile();
  list.push(r);
  await writeFile(list);
}

export async function listRsvps(): Promise<Rsvp[]> {
  let list: Rsvp[];
  if (redis) {
    const all = (await redis.hgetall<Record<string, Rsvp | string>>(KEY)) || {};
    list = Object.values(all).map((v) => (typeof v === "string" ? JSON.parse(v) : v));
  } else {
    list = await readFile();
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRsvp(id: string) {
  if (redis) {
    await redis.hdel(KEY, id);
    return;
  }
  await writeFile((await readFile()).filter((r) => r.id !== id));
}

// ── Small bits of state for the Google Sheet sync ─────────────────────────────

export type SheetSyncStatus = { at: string; ok: boolean; message: string };

// Without Redis (local development) these simply live in memory.
const local = new Map<string, unknown>();

export async function getSyncStatus(): Promise<SheetSyncStatus | null> {
  if (redis) return (await redis.get<SheetSyncStatus>("sheet:status")) || null;
  return (local.get("sheet:status") as SheetSyncStatus) || null;
}

export async function setSyncStatus(status: SheetSyncStatus) {
  if (redis) await redis.set("sheet:status", status);
  else local.set("sheet:status", status);
}

/** Takes a short-lived lock so two syncs never write to the sheet at once. */
export async function tryLock(name: string, seconds: number) {
  if (redis) return (await redis.set(name, "1", { nx: true, ex: seconds })) === "OK";
  if (local.has(name)) return false;
  local.set(name, true);
  return true;
}

export async function unlock(name: string) {
  if (redis) await redis.del(name);
  else local.delete(name);
}

/** A flag another request can raise to ask the running sync to go round once more. */
export async function raiseFlag(name: string) {
  if (redis) await redis.set(name, "1", { ex: 300 });
  else local.set(name, true);
}

export async function takeFlag(name: string) {
  if (redis) return (await redis.del(name)) > 0;
  return local.delete(name);
}
