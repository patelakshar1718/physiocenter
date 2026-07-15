import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { SettingsMap } from "../api/types";
import { useApp } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Field } from "@/components/patterns";

export default function SettingsPage() {
  const { admin } = useApp();
  const isSuperAdmin = admin?.branchId === null;
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<SettingsMap>("/settings").then(setSettings);
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaved(false);
    const updated = await api.patch<SettingsMap>("/settings", settings);
    setSettings(updated);
    setSaved(true);
  }

  if (!settings) return <div className="text-sm text-muted-foreground">Loading...</div>;

  function set(key: string, value: string) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  return (
    <div>
      <PageHeader title="Settings" />
      <Card className="p-6 max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Duplicate-scan cooldown (seconds)">
            <Input
              type="number"
              value={settings.scan_cooldown_seconds}
              onChange={(e) => set("scan_cooldown_seconds", e.target.value)}
              disabled={!isSuperAdmin}
            />
          </Field>
          <Field label="Confirmation timeout (seconds)">
            <Input
              type="number"
              value={settings.scan_confirm_timeout_seconds}
              onChange={(e) => set("scan_confirm_timeout_seconds", e.target.value)}
              disabled={!isSuperAdmin}
            />
          </Field>
          <Field label="Missed-session threshold (days)">
            <Input
              type="number"
              value={settings.missed_session_days_threshold}
              onChange={(e) => set("missed_session_days_threshold", e.target.value)}
              disabled={!isSuperAdmin}
            />
          </Field>
          <Field label="WhatsApp provider">
            <Select value={settings.whatsapp_provider} onValueChange={(v) => set("whatsapp_provider", v)} disabled={!isSuperAdmin}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stub">Stub (log only — no WhatsApp account yet)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Admin WhatsApp number (for low/zero session alerts)">
            <Input
              value={settings.admin_whatsapp_number}
              onChange={(e) => set("admin_whatsapp_number", e.target.value)}
              placeholder="+91XXXXXXXXXX"
              disabled={!isSuperAdmin}
            />
          </Field>

          {isSuperAdmin ? (
            <div className="flex items-center gap-3">
              <Button type="submit">Save Settings</Button>
              {saved && <span className="text-sm text-success">Saved.</span>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Only a super-admin can change these settings.</p>
          )}
        </form>
      </Card>
    </div>
  );
}
