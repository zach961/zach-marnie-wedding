import { cookies } from "next/headers";
import { createHash, scryptSync, timingSafeEqual } from "crypto";

export const COOKIE = "admin_session";

export function sessionToken() {
  const pw = process.env.ADMIN_PASSWORD || "";
  return createHash("sha256").update(`wedding-admin:${pw}`).digest("hex");
}

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  return c === sessionToken();
}

// Read-only key for the Google Sheet sync. It is derived from the admin password, so there is
// nothing extra to set up, changing the password replaces it, and it can't be turned back into
// the password or used to sign in.
let cached: { pw: string; key: string } | null = null;
export function sheetKey() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return "";
  if (cached?.pw !== pw) cached = { pw, key: scryptSync(pw, "wedding-sheet-sync", 24).toString("hex") };
  return cached.key;
}

export function isSheetRequest(req: Request) {
  const key = Buffer.from(sheetKey());
  const given = Buffer.from((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim());
  return key.length > 0 && given.length === key.length && timingSafeEqual(given, key);
}
