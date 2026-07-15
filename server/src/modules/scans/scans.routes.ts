import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import * as scansService from "./scans.service";
import { requireAdmin, requireDevice } from "../auth/auth.middleware";
import { BadRequestError } from "../../shared/errors";
import { asyncHandler } from "../../shared/asyncHandler";
import { scanIngestRateLimit } from "../../shared/rateLimit";

export const scansRouter = Router();

const manualSchema = z.object({
  card_uid: z.string().min(1),
  branch_id: z.number().int().optional(),
  idempotency_key: z.string().optional(),
});

// Primary production entry point today: reception types/selects a card code on
// the Kiosk page (no NFC reader yet). Feeds the exact same pipeline the
// scanner-agent will use once real hardware is purchased.
scansRouter.post("/manual", requireAdmin, scanIngestRateLimit, (req, res) => {
  const input = manualSchema.parse(req.body);
  const admin = req.admin!;

  let branchId: number;
  if (admin.branchId !== null) {
    branchId = admin.branchId;
  } else {
    if (input.branch_id === undefined) {
      throw new BadRequestError("branch_id is required for super-admin manual scans");
    }
    branchId = input.branch_id;
  }

  const event = scansService.ingestScan({
    cardUid: input.card_uid,
    idempotencyKey: input.idempotency_key ?? crypto.randomUUID(),
    source: "manual",
    branchId,
  });
  res.status(201).json(event);
});

const ingestSchema = z.object({
  card_uid: z.string().min(1),
  idempotency_key: z.string().min(1),
});

// For the scanner-agent, once real NFC hardware exists. Same ingestScan() pipeline as /manual.
scansRouter.post("/ingest", requireDevice, scanIngestRateLimit, (req, res) => {
  const input = ingestSchema.parse(req.body);
  const device = req.device!;
  const event = scansService.ingestScan({
    cardUid: input.card_uid,
    idempotencyKey: input.idempotency_key,
    source: "device",
    branchId: device.branchId,
    deviceId: device.deviceId,
  });
  res.status(201).json(event);
});

scansRouter.get("/pending", requireAdmin, (req, res) => {
  const { branch_id } = req.query;
  const admin = req.admin!;
  const branchId = admin.branchId !== null ? admin.branchId : branch_id ? Number(branch_id) : undefined;
  res.json(scansService.listPending(branchId));
});

scansRouter.post(
  "/:id/confirm",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const event = await scansService.confirmScan(Number(req.params.id), req.admin!.adminId);
    res.json(event);
  })
);

scansRouter.post("/:id/cancel", requireAdmin, (req, res) => {
  const event = scansService.cancelScan(Number(req.params.id), req.admin!.adminId);
  res.json(event);
});
