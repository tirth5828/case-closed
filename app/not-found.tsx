import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start px-6 pt-20 pb-24">
      <span className="datestamp text-[11px] text-ink-3">
        case no. 404
        <br />
        records division
      </span>
      <h1 className="mt-8 font-display text-4xl font-black uppercase leading-[1.1] sm:text-5xl">
        File{" "}
        <span className="stamp stamp-hero text-stamp px-2 align-middle text-3xl sm:text-4xl">
          not found
        </span>
      </h1>
      <p className="mt-6 max-w-md text-ink-2">
        The Records Division searched the cabinet and sent back its standard closure:
      </p>
      <blockquote className="mt-4 max-w-md border-l-2 pl-3" style={{ borderColor: "var(--stamp)" }}>
        <p className="text-[15px] leading-relaxed">
          &ldquo;The Division responded to this request and was not able to locate a page at this
          address. The request has been closed. If the page still exists, please file a new
          navigation.&rdquo;
        </p>
      </blockquote>
      <p className="mt-3 font-mono text-[12px] text-ink-3">
        Unlike the city, we&apos;ll tell you what to do next:
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded bg-ink px-5 py-2.5 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2"
        >
          Back to the index →
        </Link>
        <Link
          href="/ask"
          className="rounded border border-ink px-5 py-2.5 font-display font-bold uppercase tracking-wide hover:bg-card"
        >
          File a complaint instead
        </Link>
      </div>
    </main>
  );
}
