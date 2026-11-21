"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ColumnDef } from "@tanstack/react-table";
import { Download, ShieldCheck, ShieldAlert, AlertTriangle, Activity } from "lucide-react";

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

  const handleExport = () => {
    window.open("/api/v1/audit/export", "_blank");
  };

  const columns: ColumnDef<AuditLogRecord>[] = [
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      accessorKey: "actorName",
      header: "Actor",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-foreground text-base block">{row.original.actorName}</span>
          <span className="text-xs text-muted-foreground capitalize">{row.original.actorRole}</span>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-accent/40 text-foreground">
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: "summary",
      header: "Event Summary",
      cell: ({ row }) => (
        <span className="text-base text-foreground line-clamp-1">{row.original.summary}</span>
      ),
    },
    {
      accessorKey: "result",
      header: "Result",
      cell: ({ row }) => {
        const res = row.original.result;
        return (
          <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-accent text-accent-foreground">
            {res}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Details",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setSelectedLog(row.original)}
        >
          View Diff
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Audit Trail"
          description="Track administrative actions, access events, and sensitive data changes."
        />
        <Button onClick={handleExport} variant="outline" className="rounded-full px-6 gap-2">
          <Download className="size-5" />
          Export to CSV
        </Button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Events"
          value={stats?.total ?? 0}
          subtitle="Audit entries recorded"
          icon={Activity}
        />
        <StatCard
          label="Successful Actions"
          value={stats?.totalSuccess ?? 0}
          subtitle="Allowed operations"
          icon={ShieldCheck}
        />
        <StatCard
          label="Denied Accesses"
          value={stats?.totalDenied ?? 0}
          subtitle="Unauthorized access blocked"
          icon={ShieldAlert}
        />
        <StatCard
          label="Failed Requests"
          value={stats?.totalFailed ?? 0}
          subtitle="Errors or rejected actions"
          icon={AlertTriangle}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar>
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search by actor, action or summary..."
        />
        <div className="w-48">
          <Select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
            <option value="">All Results</option>
            <option value="success">Success Only</option>
            <option value="denied">Denied Only</option>
            <option value="failed">Failed Only</option>
          </Select>
        </div>
      </FilterBar>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={logs}
        loading={isLoading}
        emptyMessage="No audit logs found matching your criteria."
      />

      {/* Side Sheet for Detailed Log and Diffs */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <SheetContent side="right" className="space-y-6">
            <SheetHeader>
              <SheetTitle>Audit Log Details</SheetTitle>
              <SheetDescription>
                Detailed capture of actor, request context, and before/after payloads.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 text-base">
              <div className="p-4 rounded-2xl bg-accent/20 border border-border/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action</span>
                  <span className="font-semibold">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actor</span>
                  <span className="font-semibold">
                    {selectedLog.actorName} ({selectedLog.actorRole})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Result</span>
                  <span className="font-semibold uppercase">{selectedLog.result}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp</span>
                  <span className="tabular-nums">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
                {selectedLog.ip && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP Address</span>
                    <span className="tabular-nums">{selectedLog.ip}</span>
                  </div>
                )}
                {selectedLog.requestId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Request ID</span>
                    <span className="text-xs font-mono">{selectedLog.requestId}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-foreground p-3 rounded-2xl bg-card border border-border">
                  {selectedLog.summary}
                </p>
              </div>

              {/* Before and After Diffs */}
              {selectedLog.before && (
                <div>
                  <h4 className="font-semibold mb-2">State Before</h4>
                  <pre className="p-4 rounded-2xl bg-accent/30 border border-border text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <h4 className="font-semibold mb-2">State After</h4>
                  <pre className="p-4 rounded-2xl bg-accent/30 border border-border text-xs overflow-x-auto">
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
