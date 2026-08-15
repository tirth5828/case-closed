"use client";

import { useState } from "react";

/**
 * The receipts panel: every number on screen expands to the literal Socrata
 * URL that produced it. Answers "is the AI making this up?" before it's asked.
 */
export default function ReceiptLink({ url, fromCache = false }: { url: string; fromCache?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-[12px]">
      <button
        onClick={() => setOpen(!open)}
        className="font-mono text-receipt underline decoration-dotted underline-offset-2 hover:decoration-solid cursor-pointer"
        aria-expanded={open}
      >
        {open ? "▾ receipt" : "▸ receipt"}
      </button>
      {fromCache && (
        <span className="ml-2 rounded border border-hairline px-1 py-0.5 font-mono text-[10px] text-ink-3">
          served from cache
        </span>
      )}
      {open && (
        <div className="mt-1 rounded border border-hairline bg-paper p-2">
          <p className="mb-1 text-ink-2">This number comes from this exact NYC Open Data query:</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono break-all text-receipt hover:underline"
          >
            {url}
          </a>
        </div>
      )}
    </div>
  );
}
