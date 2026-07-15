import { Router } from "express";
import { z } from "zod";
import * as settingsService from "./settings.service";
import { requireAdmin, requireSuperAdmin } from "../auth/auth.middleware";

export const settingsRouter = Router();
settingsRouter.use(requireAdmin);

settingsRouter.get("/", (_req, res) => {
  res.json(settingsService.getAllSettings());
});

const patchSchema = z.record(z.string());

settingsRouter.patch("/", requireSuperAdmin, (req, res) => {
  res.json(settingsService.updateSettings(patchSchema.parse(req.body)));
});
