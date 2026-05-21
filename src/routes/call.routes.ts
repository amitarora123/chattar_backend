import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { getCallHistory } from "@/controllers/CallController";

const router = Router();

router.get("/", authMiddleware, getCallHistory);

export default router;
