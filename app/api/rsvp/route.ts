import { after, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { addRsvp, storageReady } from "@/lib/store";
import { rsvpDeadline } from "@/lib/content";
import { syncSheet } from "@/lib/sheet-sync";

export async function POST(req: Request) {
  if (Date.now() > new Date(rsvpDeadline.iso).getTime()) {
    return NextResponse.json({ error: "RSVPs have closed." }, { status: 403 });
  }
  if (!storageReady()) {
    return NextResponse.json({ error: "Storage is not connected yet." }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot field — real guests never fill it.
  if (body.website) return NextResponse.json({ ok: true });

  const attending = body.attending === true;
  const clamp = (n: unknown, max: number) =>
    Math.max(0, Math.min(max, Math.floor(Number(n) || 0)));
  const names: string[] = Array.isArray(body.names)
    ? body.names.map((n: unknown) => String(n ?? "").trim().slice(0, 80)).filter(Boolean)
    : [];

  const adults = attending ? clamp(body.adults, 12) : names.length;
  const kids = attending ? clamp(body.kids, 12) : 0;

  if (names.length === 0) {
    return NextResponse.json({ error: "Please enter at least one name." }, { status: 400 });
  }
  if (attending && (adults < 1 || names.length !== adults)) {
    return NextResponse.json({ error: "Please enter a name for each adult." }, { status: 400 });
  }
  if (attending && typeof body.transport !== "boolean") {
    return NextResponse.json({ error: "Please let us know if you need transport to the reception." }, { status: 400 });
  }

  await addRsvp({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    attending,
    adults,
    kids,
    names,
    ...(attending ? { transport: body.transport as boolean } : {}),
  });
  // Update the Google Sheet once the guest has their answer; a sheet problem never affects the RSVP.
  after(() => syncSheet());
  return NextResponse.json({ ok: true });
}
