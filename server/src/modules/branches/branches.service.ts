import { db } from "../../db/connection";
import { NotFoundError } from "../../shared/errors";

export interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: number;
  created_at: string;
}

export function listBranches(): Branch[] {
  return db.prepare("SELECT * FROM branches ORDER BY name").all() as Branch[];
}

export function getBranch(id: number): Branch {
  const row = db.prepare("SELECT * FROM branches WHERE id = ?").get(id) as Branch | undefined;
  if (!row) throw new NotFoundError("Branch not found");
  return row;
}

export function createBranch(input: { name: string; address?: string; phone?: string }): Branch {
  const result = db
    .prepare("INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)")
    .run(input.name, input.address ?? null, input.phone ?? null);
  return getBranch(Number(result.lastInsertRowid));
}

export function updateBranch(
  id: number,
  input: Partial<{ name: string; address: string; phone: string; is_active: boolean }>
): Branch {
  const current = getBranch(id);
  db.prepare("UPDATE branches SET name = ?, address = ?, phone = ?, is_active = ? WHERE id = ?").run(
    input.name ?? current.name,
    input.address ?? current.address,
    input.phone ?? current.phone,
    input.is_active === undefined ? current.is_active : input.is_active ? 1 : 0,
    id
  );
  return getBranch(id);
}
