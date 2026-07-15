import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Patient, PatientType } from "../api/types";
import { useApp } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState, Field } from "@/components/patterns";

export default function PatientsPage() {
  const { admin, branches, selectedBranchId } = useApp();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [types, setTypes] = useState<PatientType[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [typeId, setTypeId] = useState("");
  const [branchId, setBranchId] = useState<string>("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBranchId) params.set("branch_id", String(selectedBranchId));
    if (query) params.set("query", query);
    const [patientList, typeList] = await Promise.all([
      api.get<Patient[]>(`/patients?${params.toString()}`),
      api.get<PatientType[]>("/patient-types"),
    ]);
    setPatients(patientList);
    setTypes(typeList);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const effectiveBranchId = admin?.branchId ?? (branchId ? Number(branchId) : selectedBranchId);
    if (!effectiveBranchId) {
      alert("Please select a branch first (use the branch selector at top, or pick one below).");
      return;
    }
    await api.post("/patients", {
      full_name: fullName,
      whatsapp_number: whatsapp,
      contact_phone: phone || undefined,
      patient_type_id: typeId ? Number(typeId) : undefined,
      branch_id: effectiveBranchId,
    });
    setFullName("");
    setWhatsapp("");
    setPhone("");
    setTypeId("");
    setBranchId("");
    setShowForm(false);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "Add Patient"}</Button>}
      />

      {showForm && (
        <Card className="p-4 mb-6">
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full Name">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
            <Field label="WhatsApp Number">
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                required
              />
            </Field>
            <Field label="Contact Phone (optional)">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Patient Type">
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {admin?.branchId === null && (
              <Field label="Branch">
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedBranchId ? "Use selected branch" : "Select branch..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Button type="submit" className="sm:col-span-2 w-fit">
              Save Patient
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Search by name or phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="submit" variant="secondary" className="sm:w-fit">
            Search
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : patients.length === 0 ? (
          <EmptyState message="No patients found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">WhatsApp</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link to={`/patients/${p.id}`} className="text-primary font-medium hover:underline">
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.whatsapp_number}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {types.find((t) => t.id === p.patient_type_id)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.is_active ? "Active" : "Inactive"}</td>
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
