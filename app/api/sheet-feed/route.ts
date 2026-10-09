import { NextResponse } from "next/server";
import { isSheetRequest } from "@/lib/auth";
import { listRsvps } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Read-only list of replies for the Google Sheet sync script (public/rsvp-sheet-sync.txt). */
export async function GET(req: Request) {
  if (!isSheetRequest(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const rsvps = await listRsvps();
  return NextResponse.json({ ok: true, rsvps }, { headers: { "Cache-Control": "no-store" } });
}
