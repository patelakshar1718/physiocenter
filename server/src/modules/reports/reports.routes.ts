import { Request, Router } from "express";
import * as reportsService from "./reports.service";
import { requireAdmin } from "../auth/auth.middleware";

export const reportsRouter = Router();
reportsRouter.use(requireAdmin);

function resolveBranchId(req: Request): number | undefined {
  const admin = req.admin!;
  if (admin.branchId !== null) return admin.branchId;
  const q = req.query.branch_id;
  return q ? Number(q) : undefined;
}

reportsRouter.get("/remaining-sessions", (req, res) => {
  res.json(reportsService.getRemainingSessionsReport(resolveBranchId(req)));
});

reportsRouter.get("/missed-sessions", (req, res) => {
  const days = req.query.days ? Number(req.query.days) : undefined;
  res.json(reportsService.getMissedSessionsReport(resolveBranchId(req), days));
});
