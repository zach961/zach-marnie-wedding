// Minimal Google Sheets client for a service account. No SDK: a signed JWT is exchanged for a short-lived token.

import { createSign } from "crypto";

const API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type ServiceAccount = { client_email: string; private_key: string; token_uri: string };

/** A problem worth showing to Zach as-is (sharing, wrong sheet, API switched off…). */
export class SheetError extends Error {}

/** GOOGLE_SERVICE_ACCOUNT_KEY holds the service account's JSON key file, as-is or base64-encoded. */
export function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;
  try {
    const json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    if (!json.client_email || !json.private_key) return null;
    return {
      client_email: String(json.client_email),
      private_key: String(json.private_key).replace(/\\n/g, "\n"),
      token_uri: String(json.token_uri || "https://oauth2.googleapis.com/token"),
    };
  } catch {
    return null;
  }
}

/** GOOGLE_SHEET_ID may be the bare ID or the sheet's full address. */
export function sheetId() {
  const raw = process.env.GOOGLE_SHEET_ID?.trim() || "";
  return /\/d\/([\w-]+)/.exec(raw)?.[1] || raw;
}

let token: { value: string; exp: number; email: string } | null = null;

async function accessToken(sa: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.email === sa.client_email && token.exp - 60 > now) return token.value;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri, iat: now, exp: now + 3600 })}`;
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  } catch {
    throw new SheetError("The service account key couldn't be read. Add the JSON key file again as GOOGLE_SERVICE_ACCOUNT_KEY.");
  }
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    cache: "no-store",
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new SheetError("Google rejected the service account key. It may have been deleted or disabled; create a new key and add it again.");
  }
  token = { value: body.access_token, exp: now + Number(body.expires_in || 3600), email: sa.client_email };
  return token.value;
}

/** Calls the Sheets API for the configured sheet. `path` is appended to …/spreadsheets/{id}. */
export async function sheets<T = any>(path: string, body?: unknown): Promise<T> {
  const sa = serviceAccount();
  const id = sheetId();
  if (!sa || !id) throw new SheetError("The Google Sheet isn't connected yet.");
  const res = await fetch(`${API}/${id}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: `Bearer ${await accessToken(sa)}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json: any = await res.json().catch(() => ({}));
  if (res.ok) return json as T;

  const message = String(json?.error?.message || "");
  if (res.status === 403 && /disabled|has not been used/i.test(message)) {
    throw new SheetError("The Google Sheets API isn't switched on for the service account's Google Cloud project. Enable it, wait a minute, then sync again.");
  }
  if (res.status === 403) throw new SheetError(`The service account can't edit the sheet. Share the sheet with ${sa.client_email} as an Editor.`);
  if (res.status === 404) throw new SheetError("Google couldn't find that sheet. Check GOOGLE_SHEET_ID.");
  if (res.status === 401) { token = null; throw new SheetError("Google rejected the service account key. Create a new key and add it again."); }
  throw new SheetError(`Google Sheets returned an error (${res.status}). ${message}`.trim());
}

/** 0-based column index → A1 letters. */
export function colLetter(index: number) {
  let n = index + 1;
  let s = "";
  while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Tab name quoted for A1 notation. */
export const tab = (title: string) => `'${title.replace(/'/g, "''")}'`;
