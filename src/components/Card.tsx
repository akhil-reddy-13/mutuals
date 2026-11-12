// Base Facebook-style card. Use for every panel.
export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg bg-fb-card p-4 shadow-sm ${className}`}>{children}</section>;
}
