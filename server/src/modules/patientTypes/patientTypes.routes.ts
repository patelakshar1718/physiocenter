import { Router } from "express";
import { z } from "zod";
import * as patientTypesService from "./patientTypes.service";
import { requireAdmin } from "../auth/auth.middleware";

export const patientTypesRouter = Router();
patientTypesRouter.use(requireAdmin);

patientTypesRouter.get("/", (req, res) => {
  res.json(patientTypesService.listPatientTypes(req.query.include_inactive === "true"));
});

const createSchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().int().optional(),
});

patientTypesRouter.post("/", (req, res) => {
  res.status(201).json(patientTypesService.createPatientType(createSchema.parse(req.body)));
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

patientTypesRouter.patch("/:id", (req, res) => {
  res.json(patientTypesService.updatePatientType(Number(req.params.id), updateSchema.parse(req.body)));
});

patientTypesRouter.delete("/:id", (req, res) => {
  patientTypesService.deletePatientType(Number(req.params.id));
  res.status(204).send();
});
