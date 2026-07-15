import { Router } from "express";
import { z } from "zod";
import * as cardsService from "./cards.service";
import { requireAdmin } from "../auth/auth.middleware";

export const cardsRouter = Router();
cardsRouter.use(requireAdmin);

cardsRouter.get("/", (req, res) => {
  const { status, patient_id } = req.query;
  res.json(
    cardsService.listCards({
      status: typeof status === "string" ? status : undefined,
      patientId: patient_id ? Number(patient_id) : undefined,
    })
  );
});

const issueSchema = z.object({ uid: z.string().optional(), notes: z.string().optional() });

cardsRouter.post("/", (req, res) => {
  res.status(201).json(cardsService.issueCard(issueSchema.parse(req.body)));
});

const assignSchema = z.object({ patient_id: z.number().int() });

cardsRouter.post("/:id/assign", (req, res) => {
  const { patient_id } = assignSchema.parse(req.body);
  res.json(cardsService.assignCard(Number(req.params.id), patient_id));
});

cardsRouter.post("/:id/replace", (req, res) => {
  res.json(cardsService.replaceCard(Number(req.params.id), issueSchema.parse(req.body)));
});

cardsRouter.post("/:id/deactivate", (req, res) => {
  res.json(cardsService.deactivateCard(Number(req.params.id)));
});
