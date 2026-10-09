# Marnie & Zach — Wedding Site + RSVP

A single mobile-first page (invitation cards, order of the day, venues, RSVP) and a private admin page with live totals and CSV export.

## Edit the wording
All text lives in **`lib/content.ts`** — dates, venues, timeline, RSVP copy, deadline.
Artwork lives in **`public/art/`** (replace a file with the same name to swap it).

## Deploy to Vercel (one-time, ~10 minutes)

1. **Put the code on GitHub** — create a new private repo and push this folder to it.
2. **Import into Vercel** — vercel.com → *Add New → Project* → pick the repo → *Deploy*.
   You’ll get a link like `marnie-and-zach.vercel.app` (rename it under *Settings → Domains*).
3. **Connect storage** — in the project: *Storage → Create Database → Upstash for Redis* (free plan) → *Connect to project*.
   This adds the `KV_REST_API_URL` / `KV_REST_API_TOKEN` variables automatically.
4. **Set the admin password** — *Settings → Environment Variables* → add `ADMIN_PASSWORD` = something only you two know.
5. **Redeploy** — *Deployments → ⋯ → Redeploy* so the new variables take effect.

## Using it
- Guest link: `https://<your-project>.vercel.app`
- Your dashboard: `https://<your-project>.vercel.app/admin` → totals, every reply, **Download CSV**, delete duplicates.
- RSVPs close automatically after **14 November 2026, 11:59 PM AEST** (change `rsvpDeadline` in `lib/content.ts`).

## Google Sheet sync (guest list tracking)
The site writes replies straight into the **Wedding Planning** Google Sheet through a Google service account, whenever
someone replies or a reply is deleted, and on **Sync now** in `/admin`. It adds four columns to the **Guest List** tab
(RSVP, Adults coming, RSVP name(s), Replied) and keeps a full log on an **RSVPs** tab, flagging anyone not on the list.
Nothing else in the sheet is written to.

Vercel environment variables: `GOOGLE_SERVICE_ACCOUNT_KEY` (the service account's JSON key file) and `GOOGLE_SHEET_ID`
(the sheet's ID or address). The sheet must be shared with the service account's email as an Editor.

- The guest list mostly holds first names, so a reply is linked automatically only when exactly one guest could be meant.
  Anything else shows as **NOT MATCHED** on the RSVPs tab with suggestions.
- To link one by hand, type the name as it appears on the RSVPs tab into that guest's **RSVP name(s)** cell
  (separate two names with a comma), then press **Sync now**. To undo a link, clear the cell; it won't be re-linked.
- Children are counted per reply but not matched to rows, because the form doesn't ask for children's names.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000 — RSVPs save to data/rsvps.json in dev
```
