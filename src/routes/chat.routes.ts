import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  getMyChats,
  createGroup,
  getChatById,
  getChatMessages,
  clearChat,
  getRecipientInfo,
} from "@/controllers/ChatController";

const ChatRoutes = Router();

ChatRoutes.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   name: Chats
 *   description: Chat management
 */

/**
 * @openapi
 * /api/chats/me:
 *   get:
 *     tags: [Chats]
 *     summary: Get all chats for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of chats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ChatRoutes.get("/me", getMyChats);

/**
 * @openapi
 * /api/chats/group:
 *   post:
 *     tags: [Chats]
 *     summary: Create a new group chat
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, members]
 *             properties:
 *               name:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to add to the group
 *     responses:
 *       201:
 *         description: Group chat created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ChatRoutes.post("/group", createGroup);

/**
 * @openapi
 * /api/chats/recipient/{recipient_id}:
 *   get:
 *     tags: [Chats]
 *     summary: Get recipient info by user ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipient_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipient info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     display_name:
 *                       type: string
 *                       nullable: true
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *                     last_seen:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     is_active:
 *                       type: boolean
 *                 isContact:
 *                   type: boolean
 *                 contactName:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recipient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ChatRoutes.get("/recipient/:recipient_id", getRecipientInfo);

/**
 * @openapi
 * /api/chats/{chat_id}:
 *   get:
 *     tags: [Chats]
 *     summary: Get a chat by ID
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
 *         description: Chat details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Unauthorized
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
ChatRoutes.get("/:chat_id", getChatById);

/**
 * @openapi
 * /api/chats/{chat_id}/messages:
 *   get:
 *     tags: [Chats]
 *     summary: Get messages for a chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chat_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: recipient_id
 *         schema:
 *           type: string
 *         description: User ID of the recipient (used to resolve chat when chat_id is unknown)
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
 */
ChatRoutes.get("/:chat_id/messages", getChatMessages);

/**
 * @openapi
 * /api/chats/{chat_id}/clear:
 *   delete:
 *     tags: [Chats]
 *     summary: Clear all messages in a chat
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
 *         description: Chat cleared successfully
 *       401:
 *         description: Unauthorized
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
ChatRoutes.delete("/:chat_id/clear", clearChat);

export default ChatRoutes;
