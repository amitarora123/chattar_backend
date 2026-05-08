import { Router } from "express";
import {
  checkUsername,
  searchUsers,
  updateCurrentUser,
  getCurrentUser,
} from "@/controllers/UserController";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import {
  searchUsersSchema,
  updateCurrentUserSchema,
} from "@/validators/user.validators";

const UserRoutes = Router();

/**
 * @openapi
 * tags:
 *   name: User
 *   description: User profile and search
 */

/**
 * @openapi
 * /api/user/unique/{username}:
 *   get:
 *     tags: [User]
 *     summary: Check if a username is available
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns true if username is available, false if taken
 *         content:
 *           application/json:
 *             schema:
 *               type: boolean
 *               example: true
 */
UserRoutes.get("/unique/:username", checkUsername);

/**
 * @openapi
 * /api/user/search:
 *   get:
 *     tags: [User]
 *     summary: Search for users by username or email
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Search by username prefix
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Search by email prefix
 *     responses:
 *       200:
 *         description: List of matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       avatar_url:
 *                         type: string
 *                         nullable: true
 *                   isContact:
 *                     type: boolean
 *                   contactName:
 *                     type: string
 */
UserRoutes.get(
  "/search",
  validate(searchUsersSchema),
  optionalAuthMiddleware,
  searchUsers,
);

/**
 * @openapi
 * /api/user/me:
 *   patch:
 *     tags: [User]
 *     summary: Update current user profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, avatar_url, is_active]
 *             properties:
 *               name:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: details updated successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.patch(
  "/me",
  authMiddleware,
  validate(updateCurrentUserSchema),
  updateCurrentUser,
);

/**
 * @openapi
 * /api/user/me:
 *   get:
 *     tags: [User]
 *     summary: Get current user information
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 display_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 is_active:
 *                   type: boolean
 *                 isVerified:
 *                   type: boolean
 *                 last_seen:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.get("/me", authMiddleware, getCurrentUser);

export default UserRoutes;
