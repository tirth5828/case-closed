"use client";

// Dev-only harness: renders pages in a real 390px viewport so mobile media
// queries actually fire. Not linked from anywhere.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function Preview() {
  return (
    <Suspense>
      <Frame />
    </Suspense>
  );
}

function Frame() {
  const path = useSearchParams().get("path") ?? "/";
  return (
    <div style={{ padding: 16 }}>
      <iframe
        src={path}
        style={{ width: 390, height: 780, border: "2px solid #333", background: "#fff" }}
        title="mobile preview"
      />
    </div>
  );
}
