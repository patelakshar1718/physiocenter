import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../../db/connection";
import { NotFoundError } from "../../shared/errors";

export interface Device {
  id: number;
  name: string;
  branch_id: number;
  last_seen_at: string | null;
  is_active: number;
  created_at: string;
}

export function listDevices(): Device[] {
  return db
    .prepare("SELECT id, name, branch_id, last_seen_at, is_active, created_at FROM devices ORDER BY created_at DESC")
    .all() as Device[];
}

export function createDevice(input: { name: string; branchId: number }): { device: Device; token: string } {
  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = bcrypt.hashSync(token, 10);
  const result = db
    .prepare("INSERT INTO devices (name, branch_id, api_token_hash) VALUES (?, ?, ?)")
    .run(input.name, input.branchId, tokenHash);
  const device = db
    .prepare("SELECT id, name, branch_id, last_seen_at, is_active, created_at FROM devices WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as Device | undefined;
  if (!device) throw new NotFoundError("Device not found after creation");
  return { device, token };
}

export function revokeDevice(id: number): Device {
  db.prepare("UPDATE devices SET is_active = 0 WHERE id = ?").run(id);
  const device = db
    .prepare("SELECT id, name, branch_id, last_seen_at, is_active, created_at FROM devices WHERE id = ?")
    .get(id) as Device | undefined;
  if (!device) throw new NotFoundError("Device not found");
  return device;
}
