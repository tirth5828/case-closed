"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Index" },
  { href: "/ask", label: "Ask" },
  { href: "/inquire", label: "Inquire" },
  { href: "/building", label: "Building" },
  { href: "/board", label: "Board" },
  { href: "/atlas", label: "Atlas" },
];

/** Folder tabs along the top edge of the paper sheet. */
export default function FileTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-end gap-1 px-3 sm:px-10 print:hidden" aria-label="Case file sections">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="tab"
          aria-current={pathname === t.href ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
