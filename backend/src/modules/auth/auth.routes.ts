
import { Router } from "express";

import {
  refreshTokenController,
  logoutController,
  updateProfileController,
  verifyEmailOtpController,
  requestEmailOtpController,
  phoneEmailVerificationController,
} from "./auth.controller.js";

import { authenticate } from "./auth.middleware.js";

const router = Router();

router.post("/phone-email/verify", phoneEmailVerificationController);

router.post("/request-email-otp", requestEmailOtpController);
router.post("/verify-email-otp", verifyEmailOtpController);

router.post("/refresh", refreshTokenController);
router.post("/logout", logoutController);

router.patch("/profile", authenticate, updateProfileController);

export default router;
