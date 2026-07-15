export interface Admin {
  adminId: number;
  name: string;
  email: string;
  branchId: number | null;
}

export interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: number;
  created_at: string;
}

export interface PatientType {
  id: number;
  name: string;
  is_active: number;
  sort_order: number;
  created_at: string;
}

export interface Patient {
  id: number;
  full_name: string;
  contact_phone: string | null;
  whatsapp_number: string;
  patient_type_id: number | null;
  branch_id: number;
  allow_any_branch_scan: number;
  notes: string | null;
  photo_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  granted: number;
  used: number;
  remaining: number;
}

export interface SessionAdjustment {
  id: number;
  patient_id: number;
  delta: number;
  reason: string;
  note: string | null;
  created_by_admin_id: number | null;
  created_at: string;
}

export interface Card {
  id: number;
  uid: string;
  patient_id: number | null;
  status: "issued" | "assigned" | "replaced" | "deactivated";
  issued_at: string;
  assigned_at: string | null;
  deactivated_at: string | null;
  replaced_by_card_id: number | null;
  notes: string | null;
}

export interface PatientDetail {
  patient: Patient;
  sessionSummary: SessionSummary;
  activeCard: Card | null;
}

export type ScanStatus = "pending" | "confirmed" | "cancelled" | "blocked" | "expired";

export interface ScanEvent {
  id: number;
  card_id: number;
  patient_id: number | null;
  branch_id: number;
  device_id: number | null;
  source: "manual" | "device";
  status: ScanStatus;
  block_reason: string | null;
  scanned_at: string;
  resolved_at: string | null;
  resolved_by_admin_id: number | null;
  remaining_after: number | null;
  used_after: number | null;
  idempotency_key: string | null;
}

export interface ScanPendingPayload {
  scanEventId: number;
  patient: { id: number; full_name: string; photo_url: string | null };
  cardUid: string;
  branchMismatch: boolean;
  granted: number;
  used: number;
  remaining: number;
  scannedAt: string;
}

export interface ActivityLogRow {
  id: number;
  status: string;
  block_reason: string | null;
  source: string;
  scanned_at: string;
  resolved_at: string | null;
  used_after: number | null;
  remaining_after: number | null;
  patient_id: number | null;
  patient_name: string | null;
  card_uid: string;
  branch_id: number;
  branch_name: string;
}

export interface RemainingSessionsRow {
  patient_id: number;
  full_name: string;
  branch_id: number;
  branch_name: string;
  granted: number;
  used: number;
  remaining: number;
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

export interface Device {
  id: number;
  name: string;
  branch_id: number;
  last_seen_at: string | null;
  is_active: number;
  created_at: string;
}

export type SettingsMap = Record<string, string>;
