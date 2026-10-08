"use client";

import { useEffect, useState } from "react";

/** Floating RSVP pill. Hidden on the hero (which has its own button) and once the form is on screen. */
export default function StickyRsvp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const rsvp = document.getElementById("rsvp");
    if (!hero || !rsvp) return;
    let heroVisible = true;
    let rsvpVisible = false;
    const update = () => setShow(!heroVisible && !rsvpVisible);
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === rsvp) rsvpVisible = e.isIntersecting;
      }
      update();
    }, { threshold: 0.15 });
    obs.observe(hero);
    obs.observe(rsvp);
    return () => obs.disconnect();
  }, []);

  return (
    <a href="#rsvp" className={show ? "sticky-rsvp show" : "sticky-rsvp"} aria-hidden={!show} tabIndex={show ? 0 : -1}>
      RSVP
    </a>
  );
}
