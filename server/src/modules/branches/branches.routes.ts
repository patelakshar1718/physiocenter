import { Router } from "express";
import { z } from "zod";
import * as branchesService from "./branches.service";
import { requireAdmin, requireSuperAdmin } from "../auth/auth.middleware";

export const branchesRouter = Router();
branchesRouter.use(requireAdmin);

branchesRouter.get("/", (_req, res) => {
  res.json(branchesService.listBranches());
});

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

branchesRouter.post("/", requireSuperAdmin, (req, res) => {
  const input = createSchema.parse(req.body);
  res.status(201).json(branchesService.createBranch(input));
});

const updateSchema = createSchema.partial().extend({ is_active: z.boolean().optional() });

branchesRouter.patch("/:id", requireSuperAdmin, (req, res) => {
  const input = updateSchema.parse(req.body);
  res.json(branchesService.updateBranch(Number(req.params.id), input));
});
