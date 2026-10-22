
import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";

import {
  createLoanController,
  getLoansController,
  markLoanRepaidController,
} from "./loan.controller.js";

const router = Router();

router.post("/", authenticate, createLoanController);
router.get("/", authenticate, getLoansController);
router.patch("/:id/repay", authenticate, markLoanRepaidController);

export default router;
