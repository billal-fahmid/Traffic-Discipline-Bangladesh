"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

type RoleState = "loading" | "anon" | "citizen" | "officer" | "admin" | "super_admin";

/**
 * Session-aware nav actions. Server components render <Navbar /> without
 * knowing who's signed in, so this small client island resolves the
 * viewer's role in the browser and shows the right destination:
 *   anon      → Sign In / Report Now
 *   citizen   → Dashboard / Sign Out
 *   officer   → Officer Console / Sign Out
 *   admin     → Admin / Sign Out
 */
export function NavAuthButtons() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [role, setRole] = useState<RoleState>("loading");

  useEffect(() => {
    let active = true;

    async function resolve() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setRole("anon");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (active) setRole((profile?.role as RoleState) ?? "citizen");
    }

    resolve();
    const { data: sub } = supabase.auth.onAuthStateChange(() => resolve());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setRole("anon");
    router.push("/");
    router.refresh();
  }

  if (role === "loading") {
    return (
      <Button asChild size="sm">
        <Link href="/report">Report Now</Link>
      </Button>
    );
  }

  if (role === "anon") {
    return (
      <>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign In</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/report">Report Now</Link>
        </Button>
      </>
    );
  }

  const staff =
    role === "officer"
      ? { href: "/officer", label: "Officer Console" }
      : role === "admin" || role === "super_admin"
        ? { href: "/admin", label: "Admin" }
        : { href: "/dashboard", label: "Dashboard" };

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href={staff.href}>{staff.label}</Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </>
  );
}
