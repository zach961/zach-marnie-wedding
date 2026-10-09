"use client";

import { useEffect, useRef, useState } from "react";

/** Copies either the given text or the contents of a file on this site. */
export default function CopyButton({ label, text, url }: { label: string; text?: string; url?: string }) {
  const value = useRef(text ?? "");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  // Fetched ahead of the tap: Safari only allows copying directly inside the tap itself.
  useEffect(() => {
    if (!url) return;
    fetch(url).then((r) => (r.ok ? r.text() : "")).then((t) => { value.current = t; }).catch(() => {});
  }, [url]);

  const copy = async () => {
    try {
      if (!value.current) throw new Error("nothing to copy");
      await navigator.clipboard.writeText(value.current);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button type="button" className="btn btn-outline" onClick={copy}>
      {state === "copied" ? "Copied" : state === "failed" ? "Couldn’t copy" : label}
    </button>
  );
}
