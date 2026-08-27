import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Menu } from "lucide-react";
import { NavAuthButtons } from "@/components/site/nav-auth-buttons";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <div className="signal-rule w-full" />
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldAlert className="h-[18px] w-[18px]" />
          </span>
          <span className="hidden sm:inline">Traffic Discipline BD</span>
          <span className="sm:hidden">TDB</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/report" className="transition-colors hover:text-foreground">Report a Violation</Link>
          <Link href="/track" className="transition-colors hover:text-foreground">Track a Report</Link>
          <Link href="/map" className="transition-colors hover:text-foreground">Traffic Map</Link>
          <Link href="/insights" className="transition-colors hover:text-foreground">Insights</Link>
          <Link href="/education" className="transition-colors hover:text-foreground">Education</Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <NavAuthButtons />
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
