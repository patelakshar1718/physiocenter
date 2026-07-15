import { db } from "../../db/connection";
import { NotFoundError } from "../../shared/errors";
import { getSessionSummary } from "../sessions/sessions.service";

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

export interface PatientListFilters {
  branchId?: number;
  typeId?: number;
  isActive?: boolean;
  query?: string;
}

export function listPatients(filters: PatientListFilters): Patient[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.branchId !== undefined) {
    clauses.push("branch_id = ?");
    params.push(filters.branchId);
  }
  if (filters.typeId !== undefined) {
    clauses.push("patient_type_id = ?");
    params.push(filters.typeId);
  }
  if (filters.isActive !== undefined) {
    clauses.push("is_active = ?");
    params.push(filters.isActive ? 1 : 0);
  }
  if (filters.query) {
    clauses.push("(full_name LIKE ? OR whatsapp_number LIKE ? OR contact_phone LIKE ?)");
    const like = `%${filters.query}%`;
    params.push(like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM patients ${where} ORDER BY full_name`).all(...params) as Patient[];
}

export function getPatient(id: number): Patient {
  const row = db.prepare("SELECT * FROM patients WHERE id = ?").get(id) as Patient | undefined;
  if (!row) throw new NotFoundError("Patient not found");
  return row;
}

export function getPatientDetail(id: number) {
  const patient = getPatient(id);
  const summary = getSessionSummary(id);
  const card = db
    .prepare("SELECT * FROM cards WHERE patient_id = ? AND status = 'assigned'")
    .get(id);
  return { patient, sessionSummary: summary, activeCard: card ?? null };
}

export interface PatientInput {
  full_name: string;
  contact_phone?: string;
  whatsapp_number: string;
  patient_type_id?: number;
  branch_id: number;
  allow_any_branch_scan?: boolean;
  notes?: string;
  photo_url?: string;
}

export function createPatient(input: PatientInput): Patient {
  const result = db
    .prepare(
      `INSERT INTO patients
        (full_name, contact_phone, whatsapp_number, patient_type_id, branch_id, allow_any_branch_scan, notes, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.full_name,
      input.contact_phone ?? null,
      input.whatsapp_number,
      input.patient_type_id ?? null,
      input.branch_id,
      input.allow_any_branch_scan ? 1 : 0,
      input.notes ?? null,
      input.photo_url ?? null
    );
  return getPatient(Number(result.lastInsertRowid));
}

export function updatePatient(id: number, input: Partial<PatientInput & { is_active: boolean }>): Patient {
  const current = getPatient(id);
  db.prepare(
    `UPDATE patients SET
      full_name = ?, contact_phone = ?, whatsapp_number = ?, patient_type_id = ?,
      branch_id = ?, allow_any_branch_scan = ?, notes = ?, photo_url = ?, is_active = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.full_name ?? current.full_name,
    input.contact_phone ?? current.contact_phone,
    input.whatsapp_number ?? current.whatsapp_number,
    input.patient_type_id ?? current.patient_type_id,
    input.branch_id ?? current.branch_id,
    input.allow_any_branch_scan === undefined ? current.allow_any_branch_scan : input.allow_any_branch_scan ? 1 : 0,
    input.notes ?? current.notes,
    input.photo_url ?? current.photo_url,
    input.is_active === undefined ? current.is_active : input.is_active ? 1 : 0,
    id
  );
  return getPatient(id);
}

export function deactivatePatient(id: number): Patient {
  return updatePatient(id, { is_active: false });
}
