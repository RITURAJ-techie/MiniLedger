
import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import {
  createLoanController,
  getLoansController,
  markLoanRepaidController,
  archiveLoanController,
  restoreLoanController,
  getArchivedLoansController
} from "./loan.controller.js";

const router = Router();

router.post("/", authenticate, createLoanController);
router.get("/", authenticate, getLoansController);
router.patch("/:id/repay", authenticate, markLoanRepaidController);
router.patch("/:id/archive", authenticate, archiveLoanController);
router.patch("/:id/restore", authenticate, restoreLoanController);
router.get("/archived", authenticate, getArchivedLoansController);
export default router;
