import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  getMyChats,
  createGroup,
  getChatById,
  getChatMessages,
  clearChat,
  getRecipientInfo,
  createSingleChat,
} from "@/controllers/ChatController";
import { validate } from "@/middleware/validate.middleware";
import {
  createGroupSchema,
  getChatMessagesSchema,
  clearChatSchema,
  createSingleChatSchema,
} from "@/validators/chat.validators";

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
 * /api/chats/single:
 *   get:
 *     tags: [Chats]
 *     summary: Get or create a 1-on-1 chat with a recipient
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipient_id]
 *             properties:
 *               recipient_id:
 *                 type: string
 *                 description: MongoDB ObjectId of the recipient user
 *                 pattern: '^[a-f\d]{24}$'
 *     responses:
 *       200:
 *         description: Existing or newly created chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Validation error
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ChatRoutes.get("/single", validate(createSingleChatSchema), createSingleChat);

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
 *             required: [name, memberIds]
 *             properties:
 *               name:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: User IDs to add to the group
 *               adminIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: User IDs to set as admins
 *               description:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group chat created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Validation error
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
 */
ChatRoutes.post("/group", validate(createGroupSchema), createGroup);

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
 *       403:
 *         description: User is not a participant of this chat
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
 *         name: recipient_id
 *         schema:
 *           type: string
 *         description: Resolve the chat by recipient user ID when chat_id is unknown
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
ChatRoutes.get(
  "/:chat_id/messages",
  validate(getChatMessagesSchema),
  getChatMessages,
);

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
 *       - in: query
 *         name: recipient_id
 *         schema:
 *           type: string
 *         description: Resolve the chat by recipient user ID when chat_id is unknown
 *     responses:
 *       200:
 *         description: Chat cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Chat Cleared Successfully
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
ChatRoutes.delete("/:chat_id/clear", validate(clearChatSchema), clearChat);

export default ChatRoutes;
