/**
 * Remounts on every navigation, so each page plays its "new sheet pulled
 * onto the stack" entry while the folder frame in layout.tsx stays put.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
