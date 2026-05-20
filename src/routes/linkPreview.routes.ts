import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { getLinkPreview } from "@/controllers/LinkPreviewController";

const LinkPreviewRoutes = Router();

LinkPreviewRoutes.get("/", authMiddleware, getLinkPreview);

export default LinkPreviewRoutes;
