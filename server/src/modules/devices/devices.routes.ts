import { Router } from "express";
import { z } from "zod";
import * as devicesService from "./devices.service";
import { requireAdmin, requireSuperAdmin } from "../auth/auth.middleware";

export const devicesRouter = Router();
devicesRouter.use(requireAdmin);

devicesRouter.get("/", (_req, res) => {
  res.json(devicesService.listDevices());
});

const createSchema = z.object({ name: z.string().min(1), branch_id: z.number().int() });

devicesRouter.post("/", requireSuperAdmin, (req, res) => {
  const input = createSchema.parse(req.body);
  const { device, token } = devicesService.createDevice({ name: input.name, branchId: input.branch_id });
  // token is returned once, plaintext, for the admin to paste into the scanner-agent's .env
  res.status(201).json({ device, token });
});

devicesRouter.post("/:id/revoke", requireSuperAdmin, (req, res) => {
  res.json(devicesService.revokeDevice(Number(req.params.id)));
});
