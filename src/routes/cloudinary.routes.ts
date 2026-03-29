import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { signUpload } from "@/controllers/CloudinaryController";

const CloudinaryRoutes = Router();

CloudinaryRoutes.use(authMiddleware);
CloudinaryRoutes.post("/sign", signUpload);

export default CloudinaryRoutes;
