import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../../config/env";
import { db } from "../../db/connection";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors";
import { AdminJwtPayload } from "../../shared/types";

function extractBearer(header: string | undefined): string | null {
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next(new UnauthorizedError("Missing bearer token"));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
    req.admin = payload;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

export const requireSuperAdmin: RequestHandler = (req, _res, next) => {
  if (!req.admin) return next(new UnauthorizedError());
  if (req.admin.branchId !== null) return next(new ForbiddenError("Super-admin access required"));
  next();
};

interface DeviceRow {
  id: number;
  branch_id: number;
  api_token_hash: string;
  is_active: number;
}

export const requireDevice: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next(new UnauthorizedError("Missing device token"));

  const devices = db
    .prepare("SELECT id, branch_id, api_token_hash, is_active FROM devices WHERE is_active = 1")
    .all() as DeviceRow[];

  const match = devices.find((d) => bcrypt.compareSync(token, d.api_token_hash));
  if (!match) return next(new UnauthorizedError("Invalid device token"));

  db.prepare("UPDATE devices SET last_seen_at = datetime('now') WHERE id = ?").run(match.id);
  req.device = { deviceId: match.id, branchId: match.branch_id };
  next();
};
