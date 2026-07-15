import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { PatientType } from "../api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/patterns";

export default function PatientTypesPage() {
  const [types, setTypes] = useState<PatientType[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const list = await api.get<PatientType[]>("/patient-types?include_inactive=true");
    setTypes(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/patient-types", { name: name.trim() });
    setName("");
    load();
  }

  async function toggleActive(t: PatientType) {
    await api.patch(`/patient-types/${t.id}`, { is_active: !t.is_active });
    load();
  }

  return (
    <div>
      <PageHeader title="Patient Types" />
      <Card className="p-4 mb-6">
        <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="e.g. Neurological" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" className="sm:w-fit">
            Add Type
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : types.length === 0 ? (
          <EmptyState message="No patient types yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{t.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="secondary" size="sm" onClick={() => toggleActive(t)}>
                        {t.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
