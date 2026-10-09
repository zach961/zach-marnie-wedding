import { NextResponse } from "next/server";
import { syncSheet } from "@/lib/sheet-sync";
import { getSyncStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Brings the Google Sheet up to date. Called once a day by Vercel (see vercel.json).
 * It reveals nothing about the replies, and runs at most once a minute however often it is called.
 */
export async function GET() {
  const last = await getSyncStatus();
  if (last && Date.now() - new Date(last.at).getTime() < 60_000) return NextResponse.json({ ok: last.ok });
  const status = await syncSheet();
  return NextResponse.json({ ok: Boolean(status?.ok) });
}
