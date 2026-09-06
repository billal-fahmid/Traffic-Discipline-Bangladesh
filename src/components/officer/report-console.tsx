"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/case/badges";
import { Inbox, ClipboardList, Search } from "lucide-react";

export function ReportConsole({ newReports, myReports }: { newReports: any[] | null; myReports: any[] | null }) {
  const [query, setQuery] = useState("");

  const filteredNew = useMemo(() => filterByCode(newReports, query), [newReports, query]);
  const filteredMine = useMemo(() => filterByCode(myReports, query), [myReports, query]);

  return (
    <Tabs defaultValue="new">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="new">
            <Inbox className="mr-1.5 h-4 w-4" /> New Reports ({newReports?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="mine">
            <ClipboardList className="mr-1.5 h-4 w-4" /> My Cases ({myReports?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by report code…"
            className="pl-9"
          />
        </div>
      </div>

      <TabsContent value="new">
        <ReportTable
          rows={filteredNew}
          emptyLabel={query ? "No reports match that report code." : "No new reports waiting right now."}
        />
      </TabsContent>
      <TabsContent value="mine">
        <ReportTable
          rows={filteredMine}
          emptyLabel={query ? "No reports match that report code." : "You have no active assigned cases."}
        />
      </TabsContent>
    </Tabs>
  );
}

function filterByCode(rows: any[] | null, query: string) {
  if (!rows) return rows;
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => r.report_code?.toLowerCase().includes(q));
}

function ReportTable({ rows, emptyLabel }: { rows: any[] | null; emptyLabel: string }) {
  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">{emptyLabel}</CardContent>
      </Card>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Report</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>District</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Filed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <Link href={`/officer/reports/${r.id}`} className="font-medium text-primary hover:underline">
                {r.report_code}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{r.violation_categories?.name_en ?? "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{r.district ?? "—"}</TableCell>
            <TableCell><PriorityBadge priority={r.priority} /></TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
