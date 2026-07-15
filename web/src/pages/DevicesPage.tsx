import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Device } from "../api/types";
import { useApp } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState, Field } from "@/components/patterns";

export default function DevicesPage() {
  const { branches } = useApp();
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const list = await api.get<Device[]>("/devices");
    setDevices(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !branchId) return;
    const result = await api.post<{ device: Device; token: string }>("/devices", {
      name: name.trim(),
      branch_id: Number(branchId),
    });
    setNewToken(result.token);
    setName("");
    setBranchId("");
    load();
  }

  async function handleRevoke(id: number) {
    if (!confirm("Revoke this device? It will no longer be able to submit scans.")) return;
    await api.post(`/devices/${id}/revoke`, {});
    load();
  }

  return (
    <div>
      <PageHeader title="Devices" />
      <p className="text-sm text-muted-foreground mb-4 max-w-xl">
        A device is a scanner-agent installation for a reception PC + NFC reader. There's no reader yet, so this
        is for when hardware is purchased — provisioning a device here issues a token to paste into that PC's
        scanner-agent configuration.
      </p>

      {newToken && (
        <Card className="p-4 mb-6 border-primary/30 bg-accent">
          <p className="text-sm text-accent-foreground font-medium mb-1">Device token (shown once — copy it now)</p>
          <code className="block bg-white rounded-lg px-3 py-2 text-xs break-all border border-primary/20">
            {newToken}
          </code>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setNewToken(null)}>
            Done
          </Button>
        </Card>
      )}

      <Card className="p-4 mb-6">
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
          <Field label="Device name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reception PC 1" />
          </Field>
          <Field label="Branch">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch..." />
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
          <Button type="submit" className="w-fit">
            Provision Device
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : devices.length === 0 ? (
          <EmptyState message="No devices provisioned yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Branch</th>
                  <th className="px-4 py-2.5 font-medium">Last Seen</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{d.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {branches.find((b) => b.id === d.branch_id)?.name ?? d.branch_id}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{d.last_seen_at ?? "Never"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{d.is_active ? "Active" : "Revoked"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {d.is_active === 1 && (
                        <Button variant="destructive" size="sm" onClick={() => handleRevoke(d.id)}>
                          Revoke
                        </Button>
                      )}
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
