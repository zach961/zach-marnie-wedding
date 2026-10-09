"use client";

import { useEffect, useRef, useState } from "react";
import { rsvpCopy } from "@/lib/content";

function Stepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-ctrl">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label}`}>−</button>
        <span className="stepper-val" aria-live="polite">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label}`}>+</button>
      </div>
    </div>
  );
}

export default function RsvpForm() {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [names, setNames] = useState<string[]>([""]);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const doneRef = useRef<HTMLDivElement>(null);

  // The thank-you is much shorter than the form, so bring it back into view on phones.
  useEffect(() => {
    if (status === "done") doneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [status]);

  const setAdultCount = (n: number) => {
    setAdults(n);
    setNames((prev) => Array.from({ length: n }, (_, k) => prev[k] ?? ""));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (attending === null) return setError("Please let us know if you can attend.");
    const clean = names.map((n) => n.trim());
    if (clean.some((n) => !n)) return setError(attending ? "Please enter a name for each adult." : "Please enter each name.");
    setStatus("sending");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attending, adults, kids: attending ? kids : 0, names: clean, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="rsvp-done" role="status" ref={doneRef}>
        <p className="names small">{attending ? "See you there!" : "Thank you"}</p>
        <p className="lead">{attending ? rsvpCopy.thanksYes : rsvpCopy.thanksNo}</p>
        {attending && (
          <p className="note">
            {adults} adult{adults > 1 ? "s" : ""}{kids > 0 ? ` and ${kids} child${kids > 1 ? "ren" : ""}` : ""} · {names.join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="rsvp" onSubmit={submit} noValidate>
      <fieldset className="choice">
        <legend className="field-label">Will you be joining us?</legend>
        <button type="button" className={attending === true ? "choice-btn on" : "choice-btn"} onClick={() => setAttending(true)} aria-pressed={attending === true}>
          Joyfully accepts
        </button>
        <button type="button" className={attending === false ? "choice-btn on" : "choice-btn"} onClick={() => setAttending(false)} aria-pressed={attending === false}>
          Regretfully declines
        </button>
      </fieldset>

      {attending !== null && (
        <div className="rsvp-details">
          <Stepper label={attending ? "Adults attending" : "Number of people"} value={adults} min={1} max={10} onChange={setAdultCount} />
          {attending && <Stepper label="Children attending" value={kids} min={0} max={10} onChange={setKids} />}

          <div className="names-list">
            <span className="field-label">{attending ? (adults > 1 ? "Names of adults" : "Your full name") : (adults > 1 ? "Names" : "Your full name")}</span>
            {names.map((n, k) => (
              <input
                key={k}
                className="input"
                type="text"
                autoComplete={k === 0 ? "name" : "off"}
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint={k === names.length - 1 ? "send" : "next"}
                aria-label={adults > 1 ? `Full name ${k + 1}` : "Full name"}
                placeholder={adults > 1 ? `Full name ${k + 1}` : "Full name"}
                value={n}
                onChange={(e) => setNames((prev) => prev.map((p, j) => (j === k ? e.target.value : p)))}
              />
            ))}
          </div>

          {/* honeypot */}
          <input className="hp" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden />

          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-solid wide" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send RSVP"}
          </button>
        </div>
      )}
      {attending === null && error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
