# Handoff Brief: Marnie & Zach Wedding Site + RSVP

> Paste this into Claude Code as context, or tell it: "Read HANDOFF.md and continue."
> Repo: `github.com/zach961/zach-marnie-wedding` (private, branch `main`)

---

## 1. What this is
This is a custom wedding invitation and RSVP website. It replaces a **Paperless Post** invite (`https://pp.events/b7NWXMxE`). Guests receive one shared link by text or message. Owner: **Zach** (groom). Partner: **Marnie**.

**Current status:** the code is complete, has been tested locally, and is pushed to GitHub. **It is NOT deployed yet.** The remaining work is Vercel deployment, storage, an env var and a live test.

---

## 2. Event facts (source of truth; all live in `lib/content.ts`)
| | |
|---|---|
| Date | **Saturday 23 January 2027** |
| Ceremony | **1:30 PM**, St Anna's Orthodox Church (Greek Orthodox Parish of St Anna, Gold Coast), **31A Crombie Ave, Bundall QLD 4217** |
| Reception | **4 PM – 11 PM**, **Kwila Lodge**, **5 Boomerang Rd, Mudgeeraba QLD 4213** (address verified) |
| Transport | Provided from church to reception after the ceremony |
| Dress | Formal attire. *Ladies are kindly requested to cover their shoulders in the church.* |
| RSVP deadline | **14 November 2026**, auto-closes 23:59 AEST (`rsvpDeadline.iso = 2026-11-14T23:59:59+10:00`) |

**Order of the day:** 1:30 ceremony begins · 2:30 ceremony ends · 3:00 guests travel to reception (transport provided) · 4:00 cocktails & canapés · 6:30 dinner · 8:00 music & dancing · 11:00 celebrations conclude.

**Wording conventions** (agreed with Zach):
- Ceremony card: "Please join us for the Sacrament of **Holy Matrimony** of Marnie & Zach"
- Reception card: "Following the ceremony, please join us for **An Evening of Celebration** at **Kwila Lodge**"
- RSVP copy: "We would love for you to join us in celebrating our special day. Please RSVP by 14 November so we can finalise arrangements."
- Australian formats: "14 November", no commas in "Bundall QLD 4217", a space in "4 PM".
- Don't use "I do" wording. Orthodox weddings have no vows of that kind.
- The hero lines "The wedding of" and "Gold Coast, Queensland" are Claude's wording. Zach may change them.

---

## 3. Why we rebuilt it (Paperless Post problems; all must stay fixed)
1. **Text too small.** PP bakes all text into the card image, so on a phone small caps render at about 6–7px. → **All text is live HTML** over the artwork, with a ≥15–16px minimum on mobile.
2. **No cue to scroll.** PP's RSVP buttons sat below the fold, and the "scroll down" hint was itself below the fold. → The hero has an animated **"Scroll for details"** chevron and an **"RSVP by 14 November"** button. A **sticky RSVP pill** appears after the hero and hides while the RSVP form is on screen.
3. **The card auto-flipped too fast, with no way back.** → There is **no auto-flip.** Guests switch with a **Ceremony | Reception tab toggle**, swipe, ‹ › arrows, dots, and a "View the reception card → / ← Back to the ceremony card" link. The track height animates to the active card, so the shorter card leaves no blank space.
Other PP issues fixed: details text that didn't match the cards, Kwila Lodge missing from the text, a yes/no-only RSVP, and PP branding.

---

## 4. Decisions made (don't re-ask)
- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript, hosted on **Vercel (free `*.vercel.app` link, no custom domain)**.
- **Storage:** **Upstash Redis via the Vercel Marketplace** (free). Zach did not want a Google Sheet or Supabase. The code accepts `KV_REST_API_URL`/`KV_REST_API_TOKEN` *or* `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.
- **Guest check:** **open form.** Anyone with the link can RSVP, with no matching against the guest list. Zach reconciles against his own guest sheet using the CSV export.
- **Ceremony-only guests** are handled with printed invitations, **outside this site**. The site is for guests invited to both events.
- **Data collected:** attending yes/no, number of adults, number of children, **a full name for each adult**. Nothing else (no email, dietary or songs) unless Zach asks.
- **Admin:** `/admin` is protected by the `ADMIN_PASSWORD` env var through a hashed httpOnly cookie. It shows totals, a table of replies, **Download CSV**, and **Delete** for duplicates.
- **Fonts:** self-hosted through `@fontsource` (Cormorant Garamond for body, Bodoni Moda for headings, Pinyon Script for names). `next/font/google` was dropped because the build sandbox couldn't reach Google Fonts. Either works on Vercel.

---

## 5. File map
```
app/
  layout.tsx            fonts, metadata, OG image (/og.png)
  page.tsx              hero → invitation cards → order of day → venues → RSVP → footer; revalidate=600
  globals.css           all styling (tokens: --paper #fffefc, --cream #f8f3ea, --ink #5a3d2b, --gold #c2a06a)
  api/rsvp/route.ts     POST: validates, honeypot field "website", blocks after deadline, saves
  admin/page.tsx        login (server action) + dashboard + delete (server action)
  admin/export/route.ts CSV download (auth required, UTF-8 BOM for Excel)
components/
  Invitation.tsx        two-card toggle/swipe carousel (client)
  RsvpForm.tsx          accept/decline, adult/kid steppers, one name input per adult (client)
  StickyRsvp.tsx        floating RSVP pill (IntersectionObserver on #top and #rsvp)
  Divider.tsx           gold ornament SVG
lib/
  content.ts            ALL wording, dates, venues, timeline, map links, deadline
  store.ts              Redis (prod) / data/rsvps.json fallback (dev, or LOCAL_FILE_STORE=1)
  auth.ts               admin cookie helpers
public/art/             paper.jpg (texture bg), pink-tl/br (ceremony corners), white-tl/br (reception corners),
                        church.webp, kwila.webp. Transparent WebP crops from Zach's full-size Canva exports.
public/og.png           link-preview image (crop of the ceremony card)
```
**RSVP record shape:** `{ id, createdAt, attending, adults, kids, names[] }`, stored as a Redis hash `rsvps` keyed by id.
API rules: when attending, `adults ≥ 1` and `names.length === adults`; kids are clamped 0–12; when declining, adults = number of names and kids = 0.

---

## 6. Remaining work (do this)
1. `npx vercel login` (Zach approves in the browser), then `npx vercel link` and create the project **zach-marnie-wedding**, connected to the GitHub repo so pushes auto-deploy.
2. Add **Upstash for Redis** (free) from the Vercel Marketplace and connect it to the project. If the CLI can't do it, give Zach the exact dashboard clicks: *Project → Storage → Create Database → Upstash for Redis → Free → Connect*.
3. Zach sets the password himself: `npx vercel env add ADMIN_PASSWORD production`. **Never ask him to paste secrets or tokens into chat.**
4. Deploy to production (`npx vercel --prod`) and confirm the env vars are present (`npx vercel env ls`).
5. **Live test:** load `/`. POST a test RSVP:
   `curl -X POST https://<url>/api/rsvp -H 'content-type: application/json' -d '{"attending":true,"adults":1,"kids":0,"names":["TEST – delete me"]}'` → expect `{"ok":true}`.
   Confirm it appears in `/admin`, then have Zach delete it there.
6. Optional: rename the project domain to something nicer (e.g. `marnieandzach.vercel.app`) under Settings → Domains.
7. Give Zach the final **guest link** and **admin link**.

---

## 7. Known issues / nice-to-haves (raise with Zach, don't just do them)
- The floating RSVP pill can briefly overlap a line of card text while scrolling. Options: make it smaller, or hide it while `.invite` is in view.
- `kwila.webp` is about 360 KB. It could be resized to about 800px wide to load faster.
- If Zach later wants dietary requirements, a contact phone or email, or a confirmation email (e.g. through Resend), add them deliberately. Each is a scope change.
- Possible future upgrade: matching names against the guest list. Zach chose the open form, so leave it.

## 8. Verified locally (iPhone 13 viewport, Playwright)
Hero, both cards, toggle, swipe and nav, timeline, venues, sticky pill, the RSVP accept flow with 2 adults and 1 child, the confirmation screen, the "name missing" validation (rejected), the decline flow, admin login and totals (7 attending / 5 adults / 2 kids / 3 accepted / 1 declined in test data), and CSV export all work. `next build` is clean.

## 9. Working style
Zach is busy and direct. Give short updates and do the work rather than proposing it. Australian English. Ask before anything irreversible or anything that changes his accounts beyond this project.
