"use client";

import { useEffect, useRef, useState } from "react";
import { ceremony, reception, couple } from "@/lib/content";
import Divider from "./Divider";

const tabs = [ceremony.tab, reception.tab];

export default function Invitation() {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const [h, setH] = useState<number | undefined>(undefined);

  // Size the viewport to the visible card so the shorter card has no blank space.
  useEffect(() => {
    const el = cards.current[i];
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    setH(el.offsetHeight);
    return () => ro.disconnect();
  }, [i]);

  const go = (n: number) => setI(Math.max(0, Math.min(1, n)));

  return (
    <div className="invite">
      <div className="tabs" role="tablist" aria-label="Invitation cards">
        {tabs.map((t, n) => (
          <button
            key={t}
            role="tab"
            aria-selected={i === n}
            className={i === n ? "tab active" : "tab"}
            onClick={() => go(n)}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        className="card-viewport"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <div className="card-track" style={{ transform: `translateX(-${i * 50}%)`, height: h }}>
          {/* Ceremony */}
          <article className="card" ref={(el) => { cards.current[0] = el; }} aria-hidden={i !== 0} role="tabpanel">
            <img className="corner tl" src="/art/pink-tl.webp" alt="" />
            <img className="corner br" src="/art/pink-br.webp" alt="" />
            <p className="c-small">{ceremony.intro[0]}<br />{ceremony.intro[1]}</p>
            <p className="c-title">{ceremony.title}</p>
            <p className="c-small">{ceremony.of}</p>
            <p className="c-names">{couple.one} &amp; {couple.two}</p>
            <img className="c-art church" src="/art/church.webp" alt="Illustration of St Anna’s church" />
            <p className="c-small">{ceremony.date}</p>
            <p className="c-strong">{ceremony.dateLine}</p>
            <p className="c-small">{ceremony.time}</p>
            <Divider />
            <p className="c-strong">{ceremony.venue}</p>
            <p className="c-small">{ceremony.address[0]}<br />{ceremony.address[1]}</p>
            <Divider />
            <p className="c-strong">{ceremony.dress}</p>
            <p className="c-italic">{ceremony.dressNote}</p>
          </article>

          {/* Reception */}
          <article className="card" ref={(el) => { cards.current[1] = el; }} aria-hidden={i !== 1} role="tabpanel">
            <img className="corner tl" src="/art/white-tl.webp" alt="" />
            <img className="corner br" src="/art/white-br.webp" alt="" />
            <p className="c-small">{reception.intro[0]}<br />{reception.intro[1]}</p>
            <p className="c-title">{reception.title}</p>
            <p className="c-small">{reception.at}</p>
            <p className="c-title">{reception.venue}</p>
            <img className="c-art kwila" src="/art/kwila.webp" alt="Illustration of Kwila Lodge" />
            <p className="c-small">{reception.address[0]}<br />{reception.address[1]}</p>
            <Divider />
            <p className="c-strong">{reception.time}</p>
          </article>
        </div>
      </div>

      <div className="card-nav">
        <button className="nav-arrow" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous card">‹</button>
        <div className="dots">
          {tabs.map((t, n) => (
            <button key={t} className={i === n ? "dot on" : "dot"} onClick={() => go(n)} aria-label={t} />
          ))}
        </div>
        <button className="nav-arrow" onClick={() => go(i + 1)} disabled={i === 1} aria-label="Next card">›</button>
      </div>
      <button className="next-link" onClick={() => go(i === 0 ? 1 : 0)}>
        {i === 0 ? "View the reception card →" : "← Back to the ceremony card"}
      </button>
    </div>
  );
}
