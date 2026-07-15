import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be set to a long random string"),
  DB_PATH: z.string().default("./data/physiocenter.sqlite"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ENABLE_SCAN_SIMULATION: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  SEED_ADMIN_NAME: z.string().default("Admin"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@physiocenter.local"),
  SEED_ADMIN_PASSWORD: z.string().default("change-me-please"),
});

export const env = envSchema.parse(process.env);
