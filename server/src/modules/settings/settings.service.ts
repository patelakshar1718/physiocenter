import { db } from "../../db/connection";
import { DEFAULT_SETTINGS } from "../../config/constants";

export type SettingsMap = Record<string, string>;

export function getAllSettings(): SettingsMap {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const map: SettingsMap = { ...DEFAULT_SETTINGS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? (DEFAULT_SETTINGS as Record<string, string>)[key];
}

export function getSettingInt(key: string): number {
  return Number(getSetting(key));
}

export function updateSettings(patch: Record<string, string>): SettingsMap {
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  const tx = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) upsert.run(key, value);
  });
  tx(Object.entries(patch));
  return getAllSettings();
}
