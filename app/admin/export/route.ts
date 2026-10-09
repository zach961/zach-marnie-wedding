import { isAdmin } from "@/lib/auth";
import { listRsvps } from "@/lib/store";

export const dynamic = "force-dynamic";

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorised", { status: 401 });
  const rows = await listRsvps();
  const lines = [
    ["Received", "Reply", "Names", "Adults", "Kids", "Transport"].map(cell).join(","),
    ...rows.map((r) =>
      [
        new Date(r.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" }),
        r.attending ? "Accepts" : "Declines",
        r.names.join("; "),
        r.attending ? r.adults : 0,
        r.attending ? r.kids : 0,
        r.transport === true ? "Yes" : r.transport === false ? "No" : "",
      ].map(cell).join(",")
    ),
  ];
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wedding-rsvps.csv"',
    },
  });
}
