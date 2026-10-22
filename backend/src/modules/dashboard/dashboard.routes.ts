
import { Router } from "express";

import { authenticate } from "../auth/auth.middleware.js";
import { getDashboardSummaryController } from "./dashboard.controller.js";

const router = Router();

router.get("/summary", authenticate, getDashboardSummaryController);

export default router;
