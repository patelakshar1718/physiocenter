import express, { ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env";
import { AppError } from "./shared/errors";
import { logger } from "./shared/logger";

import { authRouter } from "./modules/auth/auth.routes";
import { branchesRouter } from "./modules/branches/branches.routes";
import { patientsRouter } from "./modules/patients/patients.routes";
import { patientTypesRouter } from "./modules/patientTypes/patientTypes.routes";
import { cardsRouter } from "./modules/cards/cards.routes";
import { scansRouter } from "./modules/scans/scans.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { devicesRouter } from "./modules/devices/devices.routes";
import { settingsRouter } from "./modules/settings/settings.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/branches", branchesRouter);
  app.use("/api/v1/patients", patientsRouter);
  app.use("/api/v1/patient-types", patientTypesRouter);
  app.use("/api/v1/cards", cardsRouter);
  app.use("/api/v1/scans", scansRouter);
  app.use("/api/v1", dashboardRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/devices", devicesRouter);
  app.use("/api/v1/settings", settingsRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "validation_error", issues: err.issues });
      return;
    }
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ error: "internal_error", message: "Something went wrong" });
  };
  app.use(errorHandler);

  return app;
}
