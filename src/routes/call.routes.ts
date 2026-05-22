import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { getCallHistory, getPendingCall } from "@/controllers/CallController";

const router = Router();

router.get("/pending", authMiddleware, getPendingCall);
router.get("/", authMiddleware, getCallHistory);

export default router;
