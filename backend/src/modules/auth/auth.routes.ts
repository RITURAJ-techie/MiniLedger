import { Router } from "express";

import {
  requestOtpController,
  verifyOtpController,
  refreshTokenController,
  logoutController,
  updateProfileController,
} from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";


const router = Router();

router.post("/request-otp", requestOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/refresh", refreshTokenController);
router.post("/logout", logoutController);
router.patch("/profile", authenticate, updateProfileController);

export default router;
