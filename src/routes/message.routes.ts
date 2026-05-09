import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  sendMessage,
  updateMessage,
  deleteMessage,
  getChatMessages,
} from "@/controllers/MessageController";
import { validate } from "@/middleware/validate.middleware";
import {
  getChatMessagesSchema,
  sendMessageSchema,
  updateMessageSchema,
} from "@/validators/message.validators";

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
 * /api/messages/send/{chat_id}:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message to a chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chat_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               attachment:
 *                 type: object
 *               reply_to:
 *                 type: string
 *                 description: Message ID being replied to
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Message sent successfully
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not allowed in this chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

MessageRoutes.post("/send/:chat_id", validate(sendMessageSchema), sendMessage);

/**
 * @openapi
 * /api/messages/chat/{chat_id}:
 *   get:
 *     tags: [Messages]
 *     summary: Get messages for a chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chat_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
MessageRoutes.get(
  "/chat/:chat_id",
  validate(getChatMessagesSchema),
  getChatMessages,
);

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
MessageRoutes.put("/:message_id", validate(updateMessageSchema), updateMessage);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Message Deleted Successfully
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
