import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  sendMessage,
  updateMessage,
  deleteMessage,
} from "@/controllers/MessageController";

const MessageRoutes = Router();

MessageRoutes.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   name: Messages
 *   description: Message operations
 */

/**
 * @openapi
 * /api/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message to a chat
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chatId, content]
 *             properties:
 *               chatId:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, video, file]
 *                 default: text
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
MessageRoutes.post("/", sendMessage);

/**
 * @openapi
 * /api/messages/{message_id}:
 *   put:
 *     tags: [Messages]
 *     summary: Update a message
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: message_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
MessageRoutes.put("/:message_id", updateMessage);

/**
 * @openapi
 * /api/messages/{message_id}:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a message
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: message_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
MessageRoutes.delete("/:message_id", deleteMessage);

export default MessageRoutes;
