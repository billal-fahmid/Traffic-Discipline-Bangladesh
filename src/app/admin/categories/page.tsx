import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("violation_categories").select("*").order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Violation Category Management</h1>
        <p className="mt-1 text-muted-foreground">Categories shown to citizens in the report wizard.</p>
      </div>
      <CategoryManager categories={categories ?? []} />
    </div>
  );
}
