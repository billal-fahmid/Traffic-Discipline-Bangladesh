import { createClient } from "@/lib/supabase/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { UserRoleRow } from "@/components/admin/user-role-row";

export const dynamic = "force-dynamic";

export default async function AdminCitizensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canGrantAdmin = viewer?.role === "super_admin";

  const { data: citizens } = await supabase
    .from("profiles")
    .select("id, full_name, district, is_active, created_at, reports:reports!reports_reporter_id_fkey(count)")
    .eq("role", "citizen")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Citizen Management</h1>
        <p className="mt-1 text-muted-foreground">Registered citizens and their reporting activity.</p>
      </div>

      {!citizens || citizens.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No registered citizens yet.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Reports filed</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {citizens.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.district ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.reports?.[0]?.count ?? 0}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <UserRoleRow userId={c.id} currentRole="citizen" isActive={c.is_active} canGrantAdmin={canGrantAdmin} isSelf={false} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
