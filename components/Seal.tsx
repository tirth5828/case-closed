/**
 * The project's own records-division seal (deliberately NOT the city seal -
 * it says CASE CLOSED? RECORDS DIVISION so it can't be mistaken for an
 * official mark).
 */
export default function Seal({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ color: "var(--stamp)" }}
    >
      <defs>
        <path id="seal-top" d="M 60,60 m -44,0 a 44,44 0 1,1 88,0" />
        <path id="seal-bottom" d="M 60,60 m -44,0 a 44,44 0 1,0 88,0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <text
        fontSize="10.5"
        fontFamily="var(--font-geist-mono), monospace"
        fontWeight="700"
        letterSpacing="2.5"
        fill="currentColor"
      >
        <textPath href="#seal-top" startOffset="50%" textAnchor="middle">
          CASE CLOSED?
        </textPath>
      </text>
      <text
        fontSize="8"
        fontFamily="var(--font-geist-mono), monospace"
        fontWeight="700"
        letterSpacing="1.5"
        fill="currentColor"
      >
        <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle">
          RECORDS DIVISION · NYC 2026
        </textPath>
      </text>
      <text
        x="60"
        y="66"
        fontSize="20"
        fontFamily="var(--font-overpass), sans-serif"
        fontWeight="900"
        textAnchor="middle"
        fill="currentColor"
      >
        311
      </text>
      <text x="26" y="64" fontSize="9" textAnchor="middle" fill="currentColor">
        ★
      </text>
      <text x="94" y="64" fontSize="9" textAnchor="middle" fill="currentColor">
        ★
      </text>
    </svg>
  );
}
