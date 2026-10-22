
import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../common/utils/app-error.js";
import { verifyAccessToken } from "./token.service.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError(
        401,
        "Authentication required. Provide a Bearer access token.",
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      throw new AppError(401, "Access token is missing.");
    }

    const payload = verifyAccessToken(accessToken);

    req.user = {
      id: payload.sub,
    };

    next();
  } catch (error) {
    next(error);
  }
}
