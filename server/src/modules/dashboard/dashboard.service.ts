import { db } from "../../db/connection";

export interface ActivityLogFilters {
  branchId?: number;
  patientId?: number;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
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

export function getActivityLog(filters: ActivityLogFilters): { rows: ActivityLogRow[]; total: number } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.branchId !== undefined) {
    clauses.push("se.branch_id = ?");
    params.push(filters.branchId);
  }
  if (filters.patientId !== undefined) {
    clauses.push("se.patient_id = ?");
    params.push(filters.patientId);
  }
  if (filters.status) {
    clauses.push("se.status = ?");
    params.push(filters.status);
  }
  if (filters.from) {
    clauses.push("se.scanned_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("se.scanned_at <= ?");
    params.push(filters.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50;
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(
      `SELECT se.id, se.status, se.block_reason, se.source, se.scanned_at, se.resolved_at,
              se.used_after, se.remaining_after, se.patient_id,
              p.full_name as patient_name, c.uid as card_uid, se.branch_id, b.name as branch_name
       FROM scan_events se
       JOIN cards c ON c.id = se.card_id
       LEFT JOIN patients p ON p.id = se.patient_id
       JOIN branches b ON b.id = se.branch_id
       ${where}
       ORDER BY se.scanned_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as ActivityLogRow[];

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM scan_events se ${where}`).get(...params) as {
      count: number;
    }
  ).count;

  return { rows, total };
}
