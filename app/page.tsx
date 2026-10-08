import { couple, dateShort, timeline, venues, transportNote, rsvpCopy, rsvpDeadline } from "@/lib/content";
import Invitation from "@/components/Invitation";
import RsvpForm from "@/components/RsvpForm";
import StickyRsvp from "@/components/StickyRsvp";
import Divider from "@/components/Divider";

export const revalidate = 600;

export default function Home() {
  const closed = Date.now() > new Date(rsvpDeadline.iso).getTime();

  return (
    <main>
      {/* ── Hero ───────────────────────────── */}
      <section className="hero" id="top">
        <img className="corner tl" src="/art/pink-tl.webp" alt="" />
        <img className="corner br" src="/art/pink-br.webp" alt="" />
        <p className="eyebrow">The wedding of</p>
        <h1 className="names">
          {couple.one} <span className="amp">&amp;</span> {couple.two}
        </h1>
        <Divider />
        <p className="hero-date">{dateShort}</p>
        <p className="hero-place">Gold Coast, Queensland</p>
        {!closed && (
          <a href="#rsvp" className="btn btn-solid hero-btn">
            RSVP by {rsvpDeadline.label}
          </a>
        )}
        <a href="#invitation" className="scroll-cue" aria-label="Scroll for details">
          <span>Scroll for details</span>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </a>
      </section>

      {/* ── Invitation cards ───────────────── */}
      <section className="section" id="invitation">
        <h2 className="section-title">The Invitation</h2>
        <Invitation />
      </section>

      {/* ── Order of the day ───────────────── */}
      <section className="section alt" id="schedule">
        <h2 className="section-title">Order of the Day</h2>
        <ol className="timeline">
          {timeline.map((t) => (
            <li key={t.time}>
              <span className="t-time">{t.time}</span>
              <span className="t-dot" aria-hidden />
              <span className="t-body">
                <span className="t-title">{t.title}</span>
                {t.note && <span className="t-note">{t.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Venues ─────────────────────────── */}
      <section className="section" id="venues">
        <h2 className="section-title">Getting There</h2>
        <div className="venues">
          {venues.map((v) => (
            <div className="venue" key={v.name}>
              <p className="eyebrow">{v.label} · {v.time}</p>
              <h3>{v.name}</h3>
              <p className="venue-addr">{v.address}</p>
              <a className="btn btn-outline" href={v.maps} target="_blank" rel="noreferrer">
                Open in Maps
              </a>
            </div>
          ))}
        </div>
        <p className="note">{transportNote}</p>
      </section>

      {/* ── RSVP ───────────────────────────── */}
      <section className="section alt" id="rsvp">
        <h2 className="section-title">{rsvpCopy.heading}</h2>
        <p className="lead">{rsvpCopy.intro}</p>
        {closed ? <p className="lead">{rsvpCopy.closed}</p> : (
          <>
            <p className="lead strong">{rsvpCopy.by}</p>
            <RsvpForm />
          </>
        )}
      </section>

      <footer className="footer">
        <p className="names small">{couple.one} &amp; {couple.two}</p>
        <p className="eyebrow">{dateShort}</p>
      </footer>

      {!closed && <StickyRsvp />}
    </main>
  );
}
