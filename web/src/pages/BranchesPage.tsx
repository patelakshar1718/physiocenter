import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Branch } from "../api/types";
import { useApp } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState, Field } from "@/components/patterns";

export default function BranchesPage() {
  const { reloadBranches } = useApp();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const list = await api.get<Branch[]>("/branches");
    setBranches(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/branches", { name: name.trim(), address: address || undefined, phone: phone || undefined });
    setName("");
    setAddress("");
    setPhone("");
    await load();
    await reloadBranches();
  }

  async function toggleActive(b: Branch) {
    await api.patch(`/branches/${b.id}`, { is_active: !b.is_active });
    await load();
    await reloadBranches();
  }

  return (
    <div>
      <PageHeader title="Branches" />
      <Card className="p-4 mb-6">
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. West Wing Branch" />
          </Field>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Button type="submit" className="sm:col-span-3 w-fit">
            Add Branch
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : branches.length === 0 ? (
          <EmptyState message="No branches yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Address</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{b.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{b.address ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{b.phone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{b.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="secondary" size="sm" onClick={() => toggleActive(b)}>
                        {b.is_active ? "Deactivate" : "Activate"}
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
