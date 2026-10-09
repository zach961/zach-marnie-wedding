"use client";

import { useEffect, useRef, useState } from "react";
import { ceremony, reception, couple } from "@/lib/content";
import Divider from "./Divider";

const tabs = [ceremony.tab, reception.tab];

export default function Invitation() {
  const [i, setI] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
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
            id={`invite-tab-${n}`}
            aria-controls={`invite-card-${n}`}
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
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          // Only a clearly sideways swipe changes card, so scrolling the page never does.
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(i + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        <div className="card-track" style={{ transform: `translateX(-${i * 50}%)`, height: h }}>
          {/* Ceremony */}
          <div className="card" ref={(el) => { cards.current[0] = el; }} id="invite-card-0" aria-labelledby="invite-tab-0" aria-hidden={i !== 0} role="tabpanel">
            <img className="corner tl" src="/art/pink-tl.webp" alt="" width={620} height={620} />
            <img className="corner br" src="/art/pink-br.webp" alt="" width={609} height={620} />
            <p className="c-small">{ceremony.intro[0]}<br />{ceremony.intro[1]}</p>
            <p className="c-title">{ceremony.title}</p>
            <p className="c-small">{ceremony.of}</p>
            <p className="c-names">{couple.one} &amp; {couple.two}</p>
            <img className="c-art church" src="/art/church.webp" alt="Illustration of St Anna’s church" width={655} height={555} fetchPriority="low" decoding="async" />
            <p className="c-small">{ceremony.date}</p>
            <p className="c-strong">{ceremony.dateLine}</p>
            <p className="c-small">{ceremony.time}</p>
            <Divider />
            <p className="c-strong">{ceremony.venue}</p>
            <p className="c-small">{ceremony.address[0]}<br />{ceremony.address[1]}</p>
            <Divider />
            <p className="c-strong">{ceremony.dress}</p>
            <p className="c-italic">{ceremony.dressNote}</p>
          </div>

          {/* Reception */}
          <div className="card" ref={(el) => { cards.current[1] = el; }} id="invite-card-1" aria-labelledby="invite-tab-1" aria-hidden={i !== 1} role="tabpanel">
            <img className="corner tl" src="/art/white-tl.webp" alt="" width={540} height={460} fetchPriority="low" decoding="async" />
            <img className="corner br" src="/art/white-br.webp" alt="" width={529} height={460} fetchPriority="low" decoding="async" />
            <p className="c-small">{reception.intro[0]}<br />{reception.intro[1]}</p>
            <p className="c-title">{reception.title}</p>
            <p className="c-small">{reception.at}</p>
            <p className="c-title">{reception.venue}</p>
            <img className="c-art kwila" src="/art/kwila.webp" alt="Illustration of Kwila Lodge" width={950} height={725} fetchPriority="low" decoding="async" />
            <p className="c-small">{reception.address[0]}<br />{reception.address[1]}</p>
            <Divider />
            <p className="c-strong">{reception.time}</p>
          </div>
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
