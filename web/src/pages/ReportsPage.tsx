import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MissedSessionsRow, RemainingSessionsRow } from "../api/types";
import { useApp } from "../context/AppContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/patterns";

const remainingVariant = (n: number) => (n === 0 ? "destructive" : n <= 2 ? "warning" : "success");

export default function ReportsPage() {
  const { selectedBranchId } = useApp();
  const [remaining, setRemaining] = useState<RemainingSessionsRow[]>([]);
  const [missed, setMissed] = useState<MissedSessionsRow[]>([]);
  const [days, setDays] = useState("14");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const branchParam = selectedBranchId ? `branch_id=${selectedBranchId}&` : "";
    const [r, m] = await Promise.all([
      api.get<RemainingSessionsRow[]>(`/reports/remaining-sessions?${branchParam}`),
      api.get<MissedSessionsRow[]>(`/reports/missed-sessions?${branchParam}days=${days}`),
    ]);
    setRemaining(r);
    setMissed(m);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, days]);

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Remaining Sessions" />
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : remaining.length === 0 ? (
            <EmptyState message="No active patients." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Patient</th>
                    <th className="px-4 py-2.5 font-medium">Branch</th>
                    <th className="px-4 py-2.5 font-medium">Granted</th>
                    <th className="px-4 py-2.5 font-medium">Used</th>
                    <th className="px-4 py-2.5 font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {remaining.map((r) => (
                    <tr key={r.patient_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <Link to={`/patients/${r.patient_id}`} className="text-primary hover:underline">
                          {r.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.branch_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.granted}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.used}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={remainingVariant(r.remaining)}>{r.remaining}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div>
        <PageHeader
          title="Missed Sessions"
          action={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              No scan in at least
              <Input
                type="number"
                className="w-16 text-center"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
              days
            </div>
          }
        />
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : missed.length === 0 ? (
            <EmptyState message="No patients have fallen behind." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Patient</th>
                    <th className="px-4 py-2.5 font-medium">Branch</th>
                    <th className="px-4 py-2.5 font-medium">Remaining</th>
                    <th className="px-4 py-2.5 font-medium">Last Scan</th>
                    <th className="px-4 py-2.5 font-medium">Days Since</th>
                  </tr>
                </thead>
                <tbody>
                  {missed.map((r) => (
                    <tr key={r.patient_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <Link to={`/patients/${r.patient_id}`} className="text-primary hover:underline">
                          {r.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.branch_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.remaining}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.last_confirmed_scan_at ?? "Never scanned"}</td>
                      <td className="px-4 py-2.5 text-warning font-medium">{r.days_since_last_scan ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
