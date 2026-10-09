import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, isAdmin, sessionToken } from "@/lib/auth";
import { deleteRsvp, getSyncStatus, listRsvps } from "@/lib/store";
import { sheetConnection, syncSheet } from "@/lib/sheet-sync";

export const dynamic = "force-dynamic";
export const metadata = { title: "RSVPs · Admin", robots: { index: false } };

async function login(form: FormData) {
  "use server";
  if (process.env.ADMIN_PASSWORD && form.get("password") === process.env.ADMIN_PASSWORD) {
    (await cookies()).set(COOKIE, sessionToken(), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90, path: "/" });
  }
  redirect("/admin");
}

async function logout() {
  "use server";
  (await cookies()).delete(COOKIE);
  redirect("/admin");
}

async function remove(form: FormData) {
  "use server";
  if (!(await isAdmin())) return;
  await deleteRsvp(String(form.get("id")));
  after(() => syncSheet());
  revalidatePath("/admin");
}

async function syncNow() {
  "use server";
  if (!(await isAdmin())) return;
  await syncSheet();
  revalidatePath("/admin");
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function Admin() {
  if (!(await isAdmin())) {
    return (
      <main className="admin">
        <form action={login} className="admin-login">
          <h1 className="section-title">RSVPs</h1>
          {!process.env.ADMIN_PASSWORD && <p className="error">Set ADMIN_PASSWORD in Vercel to enable this page.</p>}
          <input className="input" type="password" name="password" placeholder="Password" autoFocus />
          <button className="btn btn-solid wide">Sign in</button>
        </form>
      </main>
    );
  }

  const rsvps = await listRsvps();
  const sheet = sheetConnection();
  const synced = sheet.configured ? await getSyncStatus() : null;
  // Opening the dashboard also refreshes the sheet in the background (at most once a minute).
  if (sheet.configured && (!synced || Date.now() - new Date(synced.at).getTime() > 60_000)) after(() => syncSheet());
  const yes = rsvps.filter((r) => r.attending);
  const no = rsvps.filter((r) => !r.attending);
  const adults = yes.reduce((s, r) => s + r.adults, 0);
  const kids = yes.reduce((s, r) => s + r.kids, 0);
  const transport = yes.filter((r) => r.transport).reduce((s, r) => s + r.adults + r.kids, 0);

  return (
    <main className="admin">
      <div className="admin-head">
        <h1 className="section-title">RSVPs</h1>
        <div className="admin-actions">
          <a className="btn btn-outline" href="/admin/export">Download CSV</a>
          <form action={logout}><button className="btn btn-outline">Sign out</button></form>
        </div>
      </div>

      <div className="stats">
        <div><span className="stat-n">{adults + kids}</span><span className="stat-l">Total attending</span></div>
        <div><span className="stat-n">{adults}</span><span className="stat-l">Adults</span></div>
        <div><span className="stat-n">{kids}</span><span className="stat-l">Children</span></div>
        <div><span className="stat-n">{transport}</span><span className="stat-l">Need transport</span></div>
        <div><span className="stat-n">{yes.length}</span><span className="stat-l">Accepted replies</span></div>
        <div><span className="stat-n">{no.length}</span><span className="stat-l">Declined replies</span></div>
      </div>

      {rsvps.length === 0 ? <p className="lead">No RSVPs yet.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Received</th><th>Reply</th><th>Names</th><th>Adults</th><th>Kids</th><th>Transport</th><th></th></tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id} className={r.attending ? "" : "declined"}>
                  <td>{fmt(r.createdAt)}</td>
                  <td>{r.attending ? "Accepts" : "Declines"}</td>
                  <td>{r.names.join(", ")}</td>
                  <td>{r.attending ? r.adults : "–"}</td>
                  <td>{r.attending ? r.kids : "–"}</td>
                  <td>{r.transport === true ? "Yes" : r.transport === false ? "No" : "–"}</td>
                  <td>
                    <form action={remove}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="link-btn" title="Delete this reply (e.g. a duplicate)">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="sheet-sync">
        <h2>Google Sheet</h2>
        {!sheet.configured ? (
          <p>Not connected yet. Still to add in Vercel: {sheet.missing.join(" and ")}.</p>
        ) : (
          <>
            <p className={synced && !synced.ok ? "error" : undefined}>
              {!synced ? "Connected. The first sync hasn’t run yet."
                : synced.ok ? `Last synced ${fmt(synced.at)}: ${synced.message}.`
                : `The last sync (${fmt(synced.at)}) didn’t work. ${synced.message}`}
            </p>
            <form action={syncNow}><button className="btn btn-outline">Sync now</button></form>
            <p className="sheet-sync-note">
              The sheet updates by itself whenever someone replies, whenever you open this page, and once a day. To link a reply by hand, type the name from the RSVPs tab
              into that guest’s “RSVP name(s)” cell, then press Sync now. Connected as {sheet.email}.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
