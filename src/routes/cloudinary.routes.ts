import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { signUpload } from "@/controllers/CloudinaryController";

const CloudinaryRoutes = Router();

CloudinaryRoutes.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   name: Cloudinary
 *   description: Cloudinary upload signing
 */

/**
 * @openapi
 * /api/cloudinary/sign:
 *   post:
 *     tags: [Cloudinary]
 *     summary: Get a signed upload request for Cloudinary
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               folder:
 *                 type: string
 *                 description: Cloudinary folder to upload to
 *     responses:
 *       200:
 *         description: Signed upload params
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signature:
 *                   type: string
 *                 timestamp:
 *                   type: integer
 *                 cloudName:
 *                   type: string
 *                 apiKey:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
CloudinaryRoutes.post("/sign", signUpload);

export default CloudinaryRoutes;
