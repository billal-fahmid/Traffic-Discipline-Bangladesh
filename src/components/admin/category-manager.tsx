"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { upsertCategory } from "@/app/admin/actions";
import type { ViolationCategory } from "@/lib/types";
import { Loader2, Plus } from "lucide-react";

const EMPTY = {
  id: undefined as string | undefined,
  slug: "", nameEn: "", nameBn: "", descriptionEn: "", descriptionBn: "",
  icon: "more-horizontal", severity: 1, isSpecial: false, sortOrder: 0, isActive: true,
};

export function CategoryManager({ categories }: { categories: ViolationCategory[] }) {
  const [list, setList] = useState(categories);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function edit(c: ViolationCategory) {
    setForm({
      id: c.id, slug: c.slug, nameEn: c.name_en, nameBn: c.name_bn,
      descriptionEn: c.description_en ?? "", descriptionBn: c.description_bn ?? "",
      icon: c.icon ?? "more-horizontal", severity: c.severity, isSpecial: c.is_special,
      sortOrder: c.sort_order, isActive: c.is_active,
    });
    setEditing(true);
  }

  function toggleActive(c: ViolationCategory) {
    startTransition(async () => {
      const res = await upsertCategory({
        id: c.id, slug: c.slug, nameEn: c.name_en, nameBn: c.name_bn,
        descriptionEn: c.description_en ?? undefined, descriptionBn: c.description_bn ?? undefined,
        icon: c.icon ?? undefined, severity: c.severity as 1 | 2 | 3, isSpecial: c.is_special,
        sortOrder: c.sort_order, isActive: !c.is_active,
      });
      if (res.ok) setList((l) => l.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await upsertCategory({
        id: form.id, slug: form.slug, nameEn: form.nameEn, nameBn: form.nameBn,
        descriptionEn: form.descriptionEn || undefined, descriptionBn: form.descriptionBn || undefined,
        icon: form.icon, severity: form.severity as 1 | 2 | 3, isSpecial: form.isSpecial,
        sortOrder: form.sortOrder, isActive: form.isActive,
      });
      if (res.ok) {
        setForm(EMPTY);
        setEditing(false);
        window.location.reload(); // simplest way to reflect server-computed fields (id on create)
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{editing ? "Edit category" : "New category"}</p>
            {editing && (
              <Button size="sm" variant="ghost" onClick={() => { setForm(EMPTY); setEditing(false); }}>Cancel</Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="illegal-parking" />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (lucide name)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="parking-circle-off" />
            </div>
            <div className="space-y-1.5">
              <Label>Name (English)</Label>
              <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Name (Bangla)</Label>
              <Input value={form.nameBn} onChange={(e) => setForm({ ...form, nameBn: e.target.value })} className="font-bangla" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description (English)</Label>
              <Textarea rows={2} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Severity (1–3)</Label>
              <Input type="number" min={1} max={3} value={form.severity} onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isSpecial} onChange={(e) => setForm({ ...form, isSpecial: e.target.checked })} />
              Special flow (like illegal bus stoppage)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active (visible to citizens)
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={pending || !form.slug || !form.nameEn || !form.nameBn}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing ? "Save changes" : "Create category"}
          </Button>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <p className="font-medium">{c.name_en}</p>
                <p className="font-bangla text-xs text-muted-foreground">{c.name_bn}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.slug}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.severity}</TableCell>
              <TableCell>
                <Badge variant={c.is_active ? "success" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                {c.is_special && <Badge variant="outline" className="ml-1">Special</Badge>}
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button size="sm" variant="ghost" onClick={() => edit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(c)} disabled={pending}>
                  {c.is_active ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
