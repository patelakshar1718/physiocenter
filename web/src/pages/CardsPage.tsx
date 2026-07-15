import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card as CardType, Patient } from "../api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/patterns";

const statusVariant = {
  issued: "muted",
  assigned: "success",
  replaced: "warning",
  deactivated: "destructive",
} as const;

export default function CardsPage() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [cardList, patientList] = await Promise.all([
      api.get<CardType[]>(`/cards${status !== "all" ? `?status=${status}` : ""}`),
      api.get<Patient[]>("/patients"),
    ]);
    setCards(cardList);
    setPatients(patientList);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleIssue() {
    await api.post("/cards", {});
    load();
  }

  async function handleDeactivate(id: number) {
    if (!confirm("Deactivate this card?")) return;
    await api.post(`/cards/${id}/deactivate`, {});
    load();
  }

  return (
    <div>
      <PageHeader title="Cards" action={<Button onClick={handleIssue}>Issue New Card</Button>} />

      <Card className="p-4 mb-4">
        <div className="w-full sm:w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="issued">Issued (unassigned)</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="replaced">Replaced</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : cards.length === 0 ? (
          <EmptyState message="No cards found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Patient</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Issued</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => {
                  const patient = patients.find((p) => p.id === c.patient_id);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-mono text-foreground">{c.uid}</td>
                      <td className="px-4 py-2.5">
                        {patient ? (
                          <Link to={`/patients/${patient.id}`} className="text-primary hover:underline">
                            {patient.full_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.issued_at}</td>
                      <td className="px-4 py-2.5 text-right">
                        {c.status !== "deactivated" && c.status !== "replaced" && (
                          <Button variant="destructive" size="sm" onClick={() => handleDeactivate(c.id)}>
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
