import { cookies } from "next/headers";
import { createHash } from "crypto";

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
