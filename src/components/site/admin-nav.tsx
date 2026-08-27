"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reports", label: "All Reports" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/officers", label: "Officers" },
  { href: "/admin/citizens", label: "Citizens" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/rules", label: "Traffic Rules" },
  { href: "/admin/spam", label: "Spam Review" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex flex-wrap gap-1 border-b border-border pb-3">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
