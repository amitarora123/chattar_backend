import { AuthUser } from "@/types/user.types";
import { Request, NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const token = (request.headers["authorization"] as string)?.split(" ")[1];

    if (!token) {
      return response.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    request.authUser = decoded;
    next();
  } catch (error) {
    console.log("Auth Middleware Error", error);
    const { message } = error as { message: string };
    return response.status(401).json({ message: message || "Unauthorized" });
  }
};

export const optionalAuthMiddleware = async (
  request: Request,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const token = (request.headers["authorization"] as string)?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
      request.authUser = decoded;
    }
  } catch {
    // token invalid — proceed without auth user
  }
  next();
};
