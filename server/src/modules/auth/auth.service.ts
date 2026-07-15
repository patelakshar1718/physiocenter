import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db/connection";
import { env } from "../../config/env";
import { JWT_EXPIRES_IN } from "../../config/constants";
import { UnauthorizedError } from "../../shared/errors";
import { AdminJwtPayload } from "../../shared/types";

interface AdminRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  branch_id: number | null;
  is_active: number;
}

export function login(email: string, password: string): { token: string; admin: AdminJwtPayload } {
  const row = db
    .prepare("SELECT id, name, email, password_hash, branch_id, is_active FROM admin_users WHERE email = ?")
    .get(email) as AdminRow | undefined;

  if (!row || !row.is_active || !bcrypt.compareSync(password, row.password_hash)) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const payload: AdminJwtPayload = {
    adminId: row.id,
    name: row.name,
    email: row.email,
    branchId: row.branch_id,
  };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, admin: payload };
}
