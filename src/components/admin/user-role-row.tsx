"use client";

import { useState, useTransition } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateUserRole, setUserActive } from "@/app/admin/actions";
import type { UserRole } from "@/lib/types";
import { Loader2 } from "lucide-react";

const ALL_ROLES: UserRole[] = ["citizen", "officer", "admin", "super_admin"];

export function UserRoleRow({
  userId,
  currentRole,
  isActive,
  canGrantAdmin,
  isSelf,
}: {
  userId: string;
  currentRole: UserRole;
  isActive: boolean;
  canGrantAdmin: boolean;
  isSelf: boolean;
}) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [active, setActive] = useState(isActive);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const roleOptions = canGrantAdmin ? ALL_ROLES : ALL_ROLES.filter((r) => r !== "admin" && r !== "super_admin");

  function saveRole(next: UserRole) {
    setError(null);
    startTransition(async () => {
      const res = await updateUserRole({ userId, role: next });
      if (res.ok) setRole(next);
      else setError(res.error);
    });
  }

  function toggleActive() {
    setError(null);
    const next = !active;
    startTransition(async () => {
      const res = await setUserActive({ userId, isActive: next });
      if (res.ok) setActive(next);
      else setError(res.error);
    });
  }

  if (isSelf) {
    return <Badge variant="outline">{role} (you)</Badge>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={(v) => saveRole(v as UserRole)} disabled={pending}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" variant={active ? "outline" : "destructive"} onClick={toggleActive} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? "Deactivate" : "Reactivate"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
