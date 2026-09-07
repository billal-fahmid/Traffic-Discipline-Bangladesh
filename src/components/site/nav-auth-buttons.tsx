"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useLanguage } from "@/lib/i18n/language-context";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";

type RoleState = "loading" | "anon" | "citizen" | "officer" | "admin" | "super_admin";

interface ProfileInfo {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

/**
 * Session-aware nav actions. Server components render <Navbar /> without
 * knowing who's signed in, so this small client island resolves the
 * viewer's role in the browser and shows the right destination:
 *   anon      → Sign In / Report Now
 *   citizen   → Dashboard / Profile menu
 *   officer   → Officer Console / Profile menu
 *   admin     → Admin / Profile menu
 */
export function NavAuthButtons() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useLanguage();
  const [role, setRole] = useState<RoleState>("loading");
  const [profile, setProfile] = useState<ProfileInfo | null>(null);

  useEffect(() => {
    let active = true;

    async function resolve() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setRole("anon");
        setProfile(null);
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (!active) return;
      setRole((p?.role as RoleState) ?? "citizen");
      setProfile({ id: user.id, fullName: p?.full_name ?? null, avatarUrl: p?.avatar_url ?? null, email: user.email ?? null });
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
    setProfile(null);
    router.push("/");
    router.refresh();
  }

  if (role === "loading") {
    return (
      <Button asChild size="sm">
        <Link href="/report">{t.authNav.reportNow}</Link>
      </Button>
    );
  }

  if (role === "anon") {
    return (
      <>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">{t.authNav.signIn}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/report">{t.authNav.reportNow}</Link>
        </Button>
      </>
    );
  }

  const staff =
    role === "officer"
      ? { href: "/officer", label: t.authNav.officerConsole }
      : role === "admin" || role === "super_admin"
        ? { href: "/admin", label: t.authNav.admin }
        : { href: "/dashboard", label: t.authNav.dashboard };

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href={staff.href}>{staff.label}</Link>
      </Button>
      <ProfileMenu profile={profile} onSignOut={signOut} />
    </>
  );
}

function ProfileMenu({ profile, onSignOut }: { profile: ProfileInfo | null; onSignOut: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          avatarUrl={profile?.avatarUrl}
          name={profile?.fullName}
          seed={profile?.id ?? "?"}
          className="h-5 w-5 text-[9px]"
        />
        {t.authNav.profile}
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-border p-3">
            <UserAvatar
              avatarUrl={profile?.avatarUrl}
              name={profile?.fullName}
              seed={profile?.id ?? "?"}
              className="h-10 w-10 text-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.fullName || "My Account"}</p>
              {profile?.email && <p className="truncate text-xs text-muted-foreground">{profile.email}</p>}
            </div>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <UserIcon className="h-4 w-4" /> {t.authNav.viewProfile}
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> {t.authNav.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
