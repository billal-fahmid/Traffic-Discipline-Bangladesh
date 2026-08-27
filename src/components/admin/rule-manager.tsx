"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { upsertTrafficRule } from "@/app/admin/actions";
import type { TrafficRule, ViolationCategory } from "@/lib/types";
import { Loader2, Plus } from "lucide-react";

const EMPTY = {
  id: undefined as string | undefined,
  ruleCode: "", titleEn: "", titleBn: "", descriptionEn: "", descriptionBn: "",
  categoryId: "", fineAmountBdt: "", legalReference: "", isActive: true,
};

export function RuleManager({ rules, categories }: { rules: TrafficRule[]; categories: ViolationCategory[] }) {
  const [list, setList] = useState(rules);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function edit(r: TrafficRule) {
    setForm({
      id: r.id, ruleCode: r.rule_code, titleEn: r.title_en, titleBn: r.title_bn,
      descriptionEn: r.description_en ?? "", descriptionBn: r.description_bn ?? "",
      categoryId: r.category_id ?? "", fineAmountBdt: r.fine_amount_bdt?.toString() ?? "",
      legalReference: r.legal_reference ?? "", isActive: r.is_active,
    });
    setEditing(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await upsertTrafficRule({
        id: form.id, ruleCode: form.ruleCode, titleEn: form.titleEn, titleBn: form.titleBn,
        descriptionEn: form.descriptionEn || undefined, descriptionBn: form.descriptionBn || undefined,
        categoryId: form.categoryId || undefined,
        fineAmountBdt: form.fineAmountBdt ? Number(form.fineAmountBdt) : undefined,
        legalReference: form.legalReference || undefined, isActive: form.isActive,
      });
      if (res.ok) {
        setForm(EMPTY);
        setEditing(false);
        window.location.reload();
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
            <p className="text-sm font-semibold">{editing ? "Edit rule" : "New traffic rule"}</p>
            {editing && <Button size="sm" variant="ghost" onClick={() => { setForm(EMPTY); setEditing(false); }}>Cancel</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rule code</Label>
              <Input value={form.ruleCode} onChange={(e) => setForm({ ...form, ruleCode: e.target.value })} placeholder="MVA-140-PARK" />
            </div>
            <div className="space-y-1.5">
              <Label>Linked category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title (English)</Label>
              <Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Title (Bangla)</Label>
              <Input value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} className="font-bangla" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description (English)</Label>
              <Textarea rows={2} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fine amount (BDT)</Label>
              <Input type="number" min={0} value={form.fineAmountBdt} onChange={(e) => setForm({ ...form, fineAmountBdt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Legal reference</Label>
              <Input value={form.legalReference} onChange={(e) => setForm({ ...form, legalReference: e.target.value })} placeholder="Motor Vehicles Ordinance 1983, Section 140" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={pending || !form.ruleCode || !form.titleEn || !form.titleBn}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing ? "Save changes" : "Create rule"}
          </Button>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Fine</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <p className="font-medium">{r.title_en}</p>
                <p className="text-xs text-muted-foreground">{r.legal_reference}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.rule_code}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.fine_amount_bdt ? `৳${r.fine_amount_bdt}` : "—"}</TableCell>
              <TableCell><Badge variant={r.is_active ? "success" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => edit(r)}>Edit</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
