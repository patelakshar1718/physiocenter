import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { ActivityLogRow } from "../api/types";
import { useApp } from "../context/AppContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/patterns";

const statusVariant = {
  confirmed: "success",
  pending: "muted",
  cancelled: "muted",
  blocked: "destructive",
  expired: "warning",
} as const;

export default function ActivityLogPage() {
  const { selectedBranchId } = useApp();
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBranchId) params.set("branch_id", String(selectedBranchId));
    if (status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    const result = await api.get<{ rows: ActivityLogRow[]; total: number }>(`/activity-log?${params.toString()}`);
    setRows(result.rows);
    setTotal(result.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, status, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader title="Activity Log" />

      <Card className="p-4 mb-4">
        <div className="w-full sm:w-48">
          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date/Time</th>
                  <th className="px-4 py-2.5 font-medium">Patient</th>
                  <th className="px-4 py-2.5 font-medium">Card</th>
                  <th className="px-4 py-2.5 font-medium">Branch</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{r.scanned_at}</td>
                    <td className="px-4 py-2.5 text-foreground">{r.patient_name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{r.card_uid}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.branch_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.source}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusVariant[r.status as keyof typeof statusVariant] ?? "muted"}>
                        {r.status === "blocked" ? `blocked (${r.block_reason})` : r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.remaining_after ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
          <button
            className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
