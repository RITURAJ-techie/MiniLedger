import { Router } from "express";

import {
  requestOtpController,
  verifyOtpController,
  refreshTokenController,
  logoutController,
} from "./auth.controller.js";

const router = Router();

router.post("/request-otp", requestOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/refresh", refreshTokenController);
router.post("/logout", logoutController);

export default router;
