import bcrypt from "bcryptjs";
import { db } from "./connection";
import { runMigrations } from "./migrate";
import { env } from "../config/env";
import { logger } from "../shared/logger";

runMigrations();

const existing = db.prepare("SELECT id FROM admin_users WHERE email = ?").get(env.SEED_ADMIN_EMAIL);
if (existing) {
  logger.info(`Admin ${env.SEED_ADMIN_EMAIL} already exists, skipping.`);
} else {
  const passwordHash = bcrypt.hashSync(env.SEED_ADMIN_PASSWORD, 10);
  db.prepare(
    "INSERT INTO admin_users (name, email, password_hash, branch_id) VALUES (?, ?, ?, NULL)"
  ).run(env.SEED_ADMIN_NAME, env.SEED_ADMIN_EMAIL, passwordHash);
  logger.info(`Created super-admin ${env.SEED_ADMIN_EMAIL}`);
}
