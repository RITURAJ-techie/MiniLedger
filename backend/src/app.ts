import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import { errorMiddleware } from "./common/middleware/error.middleware.js";

import loanRoutes from "./modules/loans/loan.routes.js";

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MiniLedger API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/loans", loanRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

export default app;