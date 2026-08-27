import { createClient } from "@/lib/supabase/server";
import { RuleManager } from "@/components/admin/rule-manager";

export const dynamic = "force-dynamic";

export default async function AdminRulesPage() {
  const supabase = await createClient();
  const [{ data: rules }, { data: categories }] = await Promise.all([
    supabase.from("traffic_rules").select("*").order("rule_code"),
    supabase.from("violation_categories").select("*").order("sort_order"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Traffic Rule Management</h1>
        <p className="mt-1 text-muted-foreground">The legal reference library citizens and officers see behind each violation.</p>
      </div>
      <RuleManager rules={rules ?? []} categories={categories ?? []} />
    </div>
  );
}
