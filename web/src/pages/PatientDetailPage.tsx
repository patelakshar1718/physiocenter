import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { Card as CardType, PatientDetail, SessionAdjustment } from "../api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Field, StatTile } from "@/components/patterns";

const remainingVariant = { zero: "destructive", low: "warning", healthy: "success" } as const;

export default function PatientDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [adjustments, setAdjustments] = useState<SessionAdjustment[]>([]);
  const [availableCards, setAvailableCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  const [topupDelta, setTopupDelta] = useState("10");
  const [topupReason, setTopupReason] = useState<"initial_assignment" | "topup" | "correction">(
    "initial_assignment"
  );
  const [topupNote, setTopupNote] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");

  async function load() {
    setLoading(true);
    const [d, adj, cards] = await Promise.all([
      api.get<PatientDetail>(`/patients/${id}`),
      api.get<SessionAdjustment[]>(`/patients/${id}/session-adjustments`),
      api.get<CardType[]>("/cards?status=issued"),
    ]);
    setDetail(d);
    setAdjustments(adj);
    setAvailableCards(cards);
    setLoading(false);
    setTopupReason(adj.length === 0 ? "initial_assignment" : "topup");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAdjustment(e: FormEvent) {
    e.preventDefault();
    const delta = Number(topupDelta);
    if (!delta) return;
    await api.post(`/patients/${id}/session-adjustments`, {
      delta,
      reason: topupReason,
      note: topupNote || undefined,
    });
    setTopupNote("");
    load();
  }

  async function handleAssignCard() {
    if (!selectedCardId) return;
    await api.post(`/cards/${selectedCardId}/assign`, { patient_id: Number(id) });
    setSelectedCardId("");
    load();
  }

  async function handleIssueAndAssign() {
    const card = await api.post<CardType>("/cards", {});
    await api.post(`/cards/${card.id}/assign`, { patient_id: Number(id) });
    load();
  }

  async function handleReplaceCard() {
    if (!detail?.activeCard) return;
    if (!confirm("Issue a replacement card? The current card will be deactivated.")) return;
    await api.post(`/cards/${detail.activeCard.id}/replace`, {});
    load();
  }

  async function handleDeactivateCard() {
    if (!detail?.activeCard) return;
    if (!confirm("Deactivate this card? The patient will not be able to scan until a new one is assigned.")) return;
    await api.post(`/cards/${detail.activeCard.id}/deactivate`, {});
    load();
  }

  async function toggleAllowAnyBranch() {
    if (!detail) return;
    await api.patch(`/patients/${id}`, { allow_any_branch_scan: !detail.patient.allow_any_branch_scan });
    load();
  }

  if (loading || !detail) return <div className="text-sm text-muted-foreground">Loading...</div>;

  const { patient, sessionSummary, activeCard } = detail;
  const remainingKey =
    sessionSummary.remaining === 0 ? "zero" : sessionSummary.remaining <= 2 ? "low" : "healthy";

  return (
    <div>
      <Link to="/patients" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Patients
      </Link>
      <PageHeader title={patient.full_name} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatTile label="Granted" value={sessionSummary.granted} />
        <StatTile label="Used" value={sessionSummary.used} />
        <StatTile
          label="Remaining"
          value={sessionSummary.remaining}
          badge={<Badge variant={remainingVariant[remainingKey]}>{remainingKey}</Badge>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="font-medium text-foreground mb-3">Patient Info</h2>
            <dl className="text-sm space-y-2.5">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">WhatsApp</dt>
                <dd className="text-foreground">{patient.whatsapp_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Contact Phone</dt>
                <dd className="text-foreground">{patient.contact_phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between items-center gap-3">
                <dt className="text-muted-foreground">Allow scan at any branch</dt>
                <dd>
                  <Button variant="secondary" size="sm" onClick={toggleAllowAnyBranch}>
                    {patient.allow_any_branch_scan ? "Enabled — restrict" : "Disabled — allow"}
                  </Button>
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="font-medium text-foreground mb-3">NFC Card</h2>
            {activeCard ? (
              <div className="text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-mono text-foreground">{activeCard.uid}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={handleReplaceCard}>
                    Replace Card
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDeactivateCard}>
                    Deactivate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No card assigned yet.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label>Assign an unissued card</Label>
                    <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select code..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCards.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.uid}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="secondary" onClick={handleAssignCard} disabled={!selectedCardId}>
                    Assign
                  </Button>
                </div>
                <Button onClick={handleIssueAndAssign} className="w-full sm:w-auto">
                  Issue New Card &amp; Assign
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <h2 className="font-medium text-foreground mb-3">Assign / Top-up Sessions</h2>
            <form onSubmit={handleAdjustment} className="space-y-3 mb-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Label>Sessions to add</Label>
                  <Input type="number" value={topupDelta} onChange={(e) => setTopupDelta(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label>Reason</Label>
                  <Select value={topupReason} onValueChange={(v) => setTopupReason(v as typeof topupReason)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial_assignment">Initial assignment</SelectItem>
                      <SelectItem value="topup">Top-up</SelectItem>
                      <SelectItem value="correction">Correction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field label="Note (optional)">
                <Input
                  value={topupNote}
                  onChange={(e) => setTopupNote(e.target.value)}
                  placeholder="e.g. re-examined, continuing treatment"
                />
              </Field>
              <Button type="submit">Save</Button>
            </form>

            <h3 className="text-sm font-medium text-foreground/80 mb-2">History</h3>
            <div className="space-y-1.5 max-h-80 overflow-auto">
              {adjustments.length === 0 && <p className="text-sm text-muted-foreground">No adjustments yet.</p>}
              {adjustments.map((a) => (
                <div key={a.id} className="flex justify-between text-sm border-b border-border pb-1.5">
                  <div>
                    <span className={a.delta > 0 ? "text-success" : "text-destructive"}>
                      {a.delta > 0 ? "+" : ""}
                      {a.delta}
                    </span>{" "}
                    <span className="text-muted-foreground">({a.reason})</span>
                    {a.note && <div className="text-muted-foreground text-xs">{a.note}</div>}
                  </div>
                  <div className="text-muted-foreground text-xs whitespace-nowrap">{a.created_at}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
