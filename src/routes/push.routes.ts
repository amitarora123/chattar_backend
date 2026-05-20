import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
} from "@/controllers/PushController";

const PushRoutes = Router();

PushRoutes.get("/vapid-public-key", getVapidPublicKey);
PushRoutes.post("/subscribe", authMiddleware, subscribe);
PushRoutes.post("/unsubscribe", authMiddleware, unsubscribe);

export default PushRoutes;
