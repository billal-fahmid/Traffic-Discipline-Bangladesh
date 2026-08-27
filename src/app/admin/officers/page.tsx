import { createClient } from "@/lib/supabase/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { UserRoleRow } from "@/components/admin/user-role-row";

export const dynamic = "force-dynamic";

export default async function AdminOfficersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canGrantAdmin = viewer?.role === "super_admin";

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, phone, district, role, is_active, created_at")
    .in("role", ["officer", "admin", "super_admin"])
    .order("role")
    .order("full_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Officer Management</h1>
        <p className="mt-1 text-muted-foreground">
          Manage roles and account status for officers and admins.
          {!canGrantAdmin && " Only a super_admin can grant admin or super_admin roles."}
        </p>
      </div>

      {!staff || staff.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No staff accounts yet.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Role & Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.district ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <UserRoleRow
                    userId={s.id}
                    currentRole={s.role}
                    isActive={s.is_active}
                    canGrantAdmin={canGrantAdmin}
                    isSelf={s.id === user!.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
