import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  signUploadImage,
  signUploadDoc,
} from "@/controllers/CloudinaryController";

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
 * /api/cloudinary/sign/image:
 *   post:
 *     tags: [Cloudinary]
 *     summary: Get a signed upload request for image uploads
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Signed upload params for image preset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signature:
 *                   type: string
 *                 timestamp:
 *                   type: integer
 *                 api_key:
 *                   type: string
 *                 cloud_name:
 *                   type: string
 *                 upload_preset:
 *                   type: string
 *                   example: chat-attachments-images
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error generating signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
CloudinaryRoutes.post("/sign/image", signUploadImage);

/**
 * @openapi
 * /api/cloudinary/sign/doc:
 *   post:
 *     tags: [Cloudinary]
 *     summary: Get a signed upload request for document uploads
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Signed upload params for document preset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signature:
 *                   type: string
 *                 timestamp:
 *                   type: integer
 *                 api_key:
 *                   type: string
 *                 cloud_name:
 *                   type: string
 *                 upload_preset:
 *                   type: string
 *                   example: chat-attachments-docs
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error generating signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
CloudinaryRoutes.post("/sign/doc", signUploadDoc);

export default CloudinaryRoutes;
