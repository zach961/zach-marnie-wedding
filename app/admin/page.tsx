import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, isAdmin, sessionToken } from "@/lib/auth";
import { deleteRsvp, listRsvps } from "@/lib/store";

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
  const yes = rsvps.filter((r) => r.attending);
  const no = rsvps.filter((r) => !r.attending);
  const adults = yes.reduce((s, r) => s + r.adults, 0);
  const kids = yes.reduce((s, r) => s + r.kids, 0);

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
        <div><span className="stat-n">{yes.length}</span><span className="stat-l">Accepted replies</span></div>
        <div><span className="stat-n">{no.length}</span><span className="stat-l">Declined replies</span></div>
      </div>

      {rsvps.length === 0 ? <p className="lead">No RSVPs yet.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Received</th><th>Reply</th><th>Names</th><th>Adults</th><th>Kids</th><th></th></tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id} className={r.attending ? "" : "declined"}>
                  <td>{fmt(r.createdAt)}</td>
                  <td>{r.attending ? "Accepts" : "Declines"}</td>
                  <td>{r.names.join(", ")}</td>
                  <td>{r.attending ? r.adults : "–"}</td>
                  <td>{r.attending ? r.kids : "–"}</td>
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
    </main>
  );
}
