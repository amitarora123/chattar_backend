import { AuthUser } from "@/types/user.types";
import { Request, NextFunction, Response } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import BlockedToken from "@/models/BlockedToken";

export const authMiddleware = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const accessToken = (request.headers["authorization"] as string)?.split(
      " ",
    )[1];

    if (!accessToken) {
      return response.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET!,
    ) as AuthUser;

    if (!decoded) {
      return response.status(401).json({ message: "Unauthorized Request" });
    }

    const isBlocked = await BlockedToken.exists({ token: accessToken });
    if (isBlocked) {
      return response
        .status(401)
        .json({ message: "Token has been invalidated" });
    }

    request.authUser = decoded;
    next();
  } catch (error) {
    console.log("Auth Middleware Error", error);
    // Access token expired
    if (error instanceof TokenExpiredError) {
      return response.status(401).json({
        message: "Access token expired",
        code: "ACCESS_TOKEN_EXPIRED",
      });
    }

    // Any other JWT or auth-related error
    const { message } = error as { message: string };

    return response.status(401).json({
      message: message || "Unauthorized",
    });
  }
};

export const optionalAuthMiddleware = async (
  request: Request,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const accessToken = (request.headers["authorization"] as string)?.split(
      " ",
    )[1];
    if (accessToken) {
      const isBlocked = await BlockedToken.exists({ token: accessToken });
      if (!isBlocked) {
        const decoded = jwt.verify(
          accessToken,
          process.env.ACCESS_TOKEN_SECRET!,
        ) as AuthUser;
        request.authUser = decoded;
      }
    }
  } catch {
    // token invalid — proceed without auth user
  }
  next();
};
