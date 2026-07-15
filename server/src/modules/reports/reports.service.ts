import { db } from "../../db/connection";
import { getSettingInt } from "../settings/settings.service";

export interface RemainingSessionsRow {
  patient_id: number;
  full_name: string;
  branch_id: number;
  branch_name: string;
  granted: number;
  used: number;
  remaining: number;
}

export function getRemainingSessionsReport(branchId?: number): RemainingSessionsRow[] {
  const clause = branchId !== undefined ? "WHERE p.branch_id = ? AND p.is_active = 1" : "WHERE p.is_active = 1";
  const params = branchId !== undefined ? [branchId] : [];
  return db
    .prepare(
      `SELECT p.id as patient_id, p.full_name, p.branch_id, b.name as branch_name,
              COALESCE(sa.granted, 0) as granted,
              COALESCE(se.used, 0) as used,
              COALESCE(sa.granted, 0) - COALESCE(se.used, 0) as remaining
       FROM patients p
       JOIN branches b ON b.id = p.branch_id
       LEFT JOIN (
         SELECT patient_id, SUM(delta) as granted FROM session_adjustments GROUP BY patient_id
       ) sa ON sa.patient_id = p.id
       LEFT JOIN (
         SELECT patient_id, COUNT(*) as used FROM scan_events WHERE status = 'confirmed' GROUP BY patient_id
       ) se ON se.patient_id = p.id
       ${clause}
       ORDER BY remaining ASC, p.full_name`
    )
    .all(...params) as RemainingSessionsRow[];
}

export interface MissedSessionsRow {
  patient_id: number;
  full_name: string;
  branch_id: number;
  branch_name: string;
  remaining: number;
  last_confirmed_scan_at: string | null;
  days_since_last_scan: number | null;
}

export function getMissedSessionsReport(branchId: number | undefined, days?: number): MissedSessionsRow[] {
  const thresholdDays = days ?? getSettingInt("missed_session_days_threshold");
  const clause = branchId !== undefined ? "WHERE p.branch_id = ? AND p.is_active = 1" : "WHERE p.is_active = 1";
  const params = branchId !== undefined ? [branchId] : [];

  const rows = db
    .prepare(
      `SELECT p.id as patient_id, p.full_name, p.branch_id, b.name as branch_name,
              COALESCE(sa.granted, 0) - COALESCE(se.used, 0) as remaining,
              lastScan.last_confirmed_scan_at
       FROM patients p
       JOIN branches b ON b.id = p.branch_id
       LEFT JOIN (
         SELECT patient_id, SUM(delta) as granted FROM session_adjustments GROUP BY patient_id
       ) sa ON sa.patient_id = p.id
       LEFT JOIN (
         SELECT patient_id, COUNT(*) as used FROM scan_events WHERE status = 'confirmed' GROUP BY patient_id
       ) se ON se.patient_id = p.id
       LEFT JOIN (
         SELECT patient_id, MAX(scanned_at) as last_confirmed_scan_at FROM scan_events WHERE status = 'confirmed' GROUP BY patient_id
       ) lastScan ON lastScan.patient_id = p.id
       ${clause}`
    )
    .all(...params) as (MissedSessionsRow & { days_since_last_scan: null })[];

  const now = Date.now();
  return rows
    .filter((r) => r.remaining > 0)
    .map((r) => {
      const reference = r.last_confirmed_scan_at;
      const daysSince = reference
        ? Math.floor((now - new Date(reference.replace(" ", "T") + "Z").getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return { ...r, days_since_last_scan: daysSince };
    })
    .filter((r) => r.days_since_last_scan === null || r.days_since_last_scan >= thresholdDays)
    .sort((a, b) => (b.days_since_last_scan ?? Infinity) - (a.days_since_last_scan ?? Infinity));
}
