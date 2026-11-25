"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ColumnDef } from "@tanstack/react-table";
import { Download, ShieldCheck, ShieldAlert, Activity } from "lucide-react";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "@/components/admin/AdminUI";

interface AuditLogRecord {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  result: "success" | "denied" | "failed";
  ip?: string;
  userAgent?: string;
  requestId: string;
  createdAt: string;
}

interface AuditResponse {
  data: AuditLogRecord[];
  stats: {
    total: number;
    totalSuccess: number;
    totalDenied: number;
    totalFailed: number;
  };
}

export default function AuditTrailPage() {
  const [search, setSearch] = React.useState("");
  const [resultFilter, setResultFilter] = React.useState("");
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRecord | null>(null);

  const { data: auditData, isLoading } = useQuery<AuditResponse>({
    queryKey: ["audit-trail", search, resultFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.append("search", search);
      if (resultFilter) params.append("result", resultFilter);
      const res = await fetch(`/api/v1/audit?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit trail");
      return res.json();
    },
  });

  const logs = auditData?.data || [];
  const stats = auditData?.stats;

  const columns: ColumnDef<AuditLogRecord>[] = [
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      accessorKey: "actorName",
      header: "Actor",
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-foreground text-xs block">{row.original.actorName}</span>
          <span className="text-[11px] text-muted-foreground capitalize">{row.original.actorRole}</span>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)]">
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: "summary",
      header: "Summary",
      cell: ({ row }) => (
        <span className="text-xs text-foreground line-clamp-1 max-w-xs">{row.original.summary}</span>
      ),
    },
    {
      accessorKey: "result",
      header: "Result",
      cell: ({ row }) => (
        <AdminStatusPill
          label={row.original.result}
          tone={row.original.result === "success" ? "primary" : "danger"}
        />
      ),
    },
    {
      id: "actions",
      header: "Inspect",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" onClick={() => setSelectedLog(row.original)}>
          Diff
        </Button>
      ),
    },
  ];

  const blockedOrFailed = (stats?.totalDenied ?? 0) + (stats?.totalFailed ?? 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Total Events", value: stats?.total ?? 0, icon: Activity, badge: "Recorded", tone: 1 },
          { label: "Succeeded", value: stats?.totalSuccess ?? 0, icon: ShieldCheck, badge: "Authorized", tone: 2 },
          { label: "Denied / Failed", value: blockedOrFailed, icon: ShieldAlert, badge: "Blocked", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search actor or action..."
        filters={
          <AdminFilterSelect value={resultFilter} onChange={setResultFilter}>
            <option value="">All Results</option>
            <option value="success">Success</option>
            <option value="denied">Denied</option>
            <option value="failed">Failed</option>
          </AdminFilterSelect>
        }
        actions={
          <Button
            onClick={() => window.open("/api/v1/audit/export", "_blank")}
            variant="outline"
            className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable columns={columns} data={logs} loading={isLoading} emptyMessage="No audit logs found." />
      </AdminSurface>

      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <SheetContent side="right" className="space-y-5 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Audit Details</SheetTitle>
              <SheetDescription className="text-xs">Event metadata and state diff.</SheetDescription>
            </SheetHeader>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[var(--admin-surface)] border border-[var(--admin-border)] space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Action</span><span className="font-bold">{selectedLog.action}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Actor</span><span className="font-bold">{selectedLog.actorName} ({selectedLog.actorRole})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Result</span><span className="font-bold uppercase">{selectedLog.result}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{new Date(selectedLog.createdAt).toLocaleString()}</span></div>
                {selectedLog.ip && <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-mono">{selectedLog.ip}</span></div>}
              </div>

              <div>
                <h4 className="font-bold mb-1.5">Summary</h4>
                <p className="p-3 rounded-2xl bg-white border border-border">{selectedLog.summary}</p>
              </div>

              {selectedLog.before && (
                <div>
                  <h4 className="font-bold mb-1.5">Before</h4>
                  <pre className="p-3 rounded-2xl bg-[var(--admin-surface)] border border-border text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <h4 className="font-bold mb-1.5">After</h4>
                  <pre className="p-3 rounded-2xl bg-[var(--admin-surface)] border border-border text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
