import { Router } from "express";
import * as dashboardService from "./dashboard.service";
import { requireAdmin } from "../auth/auth.middleware";

export const dashboardRouter = Router();
dashboardRouter.use(requireAdmin);

dashboardRouter.get("/activity-log", (req, res) => {
  const admin = req.admin!;
  const { patient_id, status, from, to, page, page_size, branch_id } = req.query;

  const branchId =
    admin.branchId !== null ? admin.branchId : branch_id ? Number(branch_id) : undefined;

  res.json(
    dashboardService.getActivityLog({
      branchId,
      patientId: patient_id ? Number(patient_id) : undefined,
      status: typeof status === "string" ? status : undefined,
      from: typeof from === "string" ? from : undefined,
      to: typeof to === "string" ? to : undefined,
      page: page ? Number(page) : undefined,
      pageSize: page_size ? Number(page_size) : undefined,
    })
  );
});
