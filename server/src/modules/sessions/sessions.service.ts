import { db } from "../../db/connection";
import { BadRequestError } from "../../shared/errors";

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

export function getSessionSummary(patientId: number): SessionSummary {
  const granted =
    (
      db
        .prepare("SELECT COALESCE(SUM(delta), 0) as total FROM session_adjustments WHERE patient_id = ?")
        .get(patientId) as { total: number }
    ).total ?? 0;

  const used =
    (
      db
        .prepare(
          "SELECT COUNT(*) as total FROM scan_events WHERE patient_id = ? AND status = 'confirmed'"
        )
        .get(patientId) as { total: number }
    ).total ?? 0;

  return { granted, used, remaining: granted - used };
}

export function listAdjustments(patientId: number): SessionAdjustment[] {
  return db
    .prepare("SELECT * FROM session_adjustments WHERE patient_id = ? ORDER BY created_at DESC")
    .all(patientId) as SessionAdjustment[];
}

export function addAdjustment(input: {
  patientId: number;
  delta: number;
  reason: "initial_assignment" | "topup" | "correction";
  note?: string;
  adminId: number;
}): SessionAdjustment {
  if (input.delta === 0) throw new BadRequestError("delta must be non-zero");
  const result = db
    .prepare(
      "INSERT INTO session_adjustments (patient_id, delta, reason, note, created_by_admin_id) VALUES (?, ?, ?, ?, ?)"
    )
    .run(input.patientId, input.delta, input.reason, input.note ?? null, input.adminId);
  return db
    .prepare("SELECT * FROM session_adjustments WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as SessionAdjustment;
}
