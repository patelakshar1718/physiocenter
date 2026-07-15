import { db } from "../../db/connection";
import { ConflictError, NotFoundError } from "../../shared/errors";

export interface PatientType {
  id: number;
  name: string;
  is_active: number;
  sort_order: number;
  created_at: string;
}

export function listPatientTypes(includeInactive = false): PatientType[] {
  const sql = includeInactive
    ? "SELECT * FROM patient_types ORDER BY sort_order, name"
    : "SELECT * FROM patient_types WHERE is_active = 1 ORDER BY sort_order, name";
  return db.prepare(sql).all() as PatientType[];
}

export function getPatientType(id: number): PatientType {
  const row = db.prepare("SELECT * FROM patient_types WHERE id = ?").get(id) as
    | PatientType
    | undefined;
  if (!row) throw new NotFoundError("Patient type not found");
  return row;
}

export function createPatientType(input: { name: string; sort_order?: number }): PatientType {
  const result = db
    .prepare("INSERT INTO patient_types (name, sort_order) VALUES (?, ?)")
    .run(input.name, input.sort_order ?? 0);
  return getPatientType(Number(result.lastInsertRowid));
}

export function updatePatientType(
  id: number,
  input: Partial<{ name: string; sort_order: number; is_active: boolean }>
): PatientType {
  const current = getPatientType(id);
  db.prepare("UPDATE patient_types SET name = ?, sort_order = ?, is_active = ? WHERE id = ?").run(
    input.name ?? current.name,
    input.sort_order ?? current.sort_order,
    input.is_active === undefined ? current.is_active : input.is_active ? 1 : 0,
    id
  );
  return getPatientType(id);
}

export function deletePatientType(id: number): void {
  const inUse = db
    .prepare("SELECT COUNT(*) as count FROM patients WHERE patient_type_id = ?")
    .get(id) as { count: number };
  if (inUse.count > 0) {
    throw new ConflictError("Patient type is in use; deactivate it instead of deleting");
  }
  db.prepare("DELETE FROM patient_types WHERE id = ?").run(id);
}
