// Base Facebook-style card. Use for every panel.
export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`fb-card ${className}`}>{children}</section>;
}
