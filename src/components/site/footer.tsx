import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-secondary/40">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-base font-bold">Traffic Discipline Bangladesh</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A citizen reporting platform for safer, more disciplined roads — built for every district, in Bangla and English.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Platform</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/report" className="hover:text-foreground">Report a Violation</Link></li>
            <li><Link href="/track" className="hover:text-foreground">Track a Report</Link></li>
            <li><Link href="/map" className="hover:text-foreground">Traffic Map</Link></li>
            <li><Link href="/insights" className="hover:text-foreground">Public Insights</Link></li>
            <li><Link href="/education" className="hover:text-foreground">Traffic Education</Link></li>
            <li><Link href="/dashboard" className="hover:text-foreground">Citizen Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
            <li><Link href="/register" className="hover:text-foreground">Create Account</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Privacy</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Anonymous reports never collect your name, phone, email, or NID. See how your data is handled.
          </p>
        </div>
      </div>
      <div className="border-t border-border/80 py-4">
        <p className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Traffic Discipline Bangladesh. Not affiliated with, but designed to complement, BRTA and Bangladesh Police Traffic operations.
        </p>
      </div>
    </footer>
  );
}
