import { Router } from "express";
import { z } from "zod";
import * as patientsService from "./patients.service";
import * as sessionsService from "../sessions/sessions.service";
import { requireAdmin } from "../auth/auth.middleware";

export const patientsRouter = Router();
patientsRouter.use(requireAdmin);

patientsRouter.get("/", (req, res) => {
  const { branch_id, type_id, is_active, query } = req.query;
  res.json(
    patientsService.listPatients({
      branchId: branch_id ? Number(branch_id) : undefined,
      typeId: type_id ? Number(type_id) : undefined,
      isActive: is_active === undefined ? undefined : is_active === "true",
      query: typeof query === "string" ? query : undefined,
    })
  );
});

const patientInputSchema = z.object({
  full_name: z.string().min(1),
  contact_phone: z.string().optional(),
  whatsapp_number: z.string().min(6),
  patient_type_id: z.number().int().optional(),
  branch_id: z.number().int(),
  allow_any_branch_scan: z.boolean().optional(),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
});

patientsRouter.post("/", (req, res) => {
  res.status(201).json(patientsService.createPatient(patientInputSchema.parse(req.body)));
});

patientsRouter.get("/:id", (req, res) => {
  res.json(patientsService.getPatientDetail(Number(req.params.id)));
});

const updateSchema = patientInputSchema.partial().extend({ is_active: z.boolean().optional() });

patientsRouter.patch("/:id", (req, res) => {
  res.json(patientsService.updatePatient(Number(req.params.id), updateSchema.parse(req.body)));
});

patientsRouter.delete("/:id", (req, res) => {
  res.json(patientsService.deactivatePatient(Number(req.params.id)));
});

patientsRouter.get("/:id/session-summary", (req, res) => {
  res.json(sessionsService.getSessionSummary(Number(req.params.id)));
});

patientsRouter.get("/:id/session-adjustments", (req, res) => {
  res.json(sessionsService.listAdjustments(Number(req.params.id)));
});

const adjustmentSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, "delta must be non-zero"),
  reason: z.enum(["initial_assignment", "topup", "correction"]),
  note: z.string().optional(),
});

patientsRouter.post("/:id/session-adjustments", (req, res) => {
  const input = adjustmentSchema.parse(req.body);
  const adjustment = sessionsService.addAdjustment({
    patientId: Number(req.params.id),
    delta: input.delta,
    reason: input.reason,
    note: input.note,
    adminId: req.admin!.adminId,
  });
  res.status(201).json(adjustment);
});
