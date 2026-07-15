import { Router } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { requireAdmin } from "./auth.middleware";
import { loginRateLimit } from "../../shared/rateLimit";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", loginRateLimit, (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { token, admin } = authService.login(email, password);
  res.json({ token, admin });
});

authRouter.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});
