import { Router } from "express";
import {
  signup,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  verifyUser,
  resendOtp,
  searchUsers,
  checkUsername,
  updateCurrentUser,
  getCurrentUser,
  refreshAccessToken,
  logout,
} from "@/controllers/UserController";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "@/middleware/auth.middleware";

const UserRoutes = Router();

/**
 * @openapi
 * tags:
 *   name: User
 *   description: User authentication and management
 */

/**
 * @openapi
 * /api/user/sign-up:
 *   post:
 *     tags: [User]
 *     summary: Sign up a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password, name]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created, OTP sent for verification
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/sign-up", signup);

/**
 * @openapi
 * /api/user/login:
 *   post:
 *     tags: [User]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account not verified — OTP sent, verification required before proceeding
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User not Verified Please Verify your account
 *                 requiresVerification:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: string
 *                     email:
 *                       type: string
 *       201:
 *         description: Login successful — returns JWT token and user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 token:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

UserRoutes.post("/login", login);

/**
 * @openapi
 * /api/user/google-login:
 *   post:
 *     tags: [User]
 *     summary: Log in or sign up with Google OAuth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from the client
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid Google token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/google-login", googleLogin);

/**
 * @openapi
 * /api/user/forgot-password:
 *   post:
 *     tags: [User]
 *     summary: Request a password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/forgot-password", forgotPassword);

/**
 * @openapi
 * /api/user/reset-password:
 *   post:
 *     tags: [User]
 *     summary: Reset password using a reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/reset-password", resetPassword);

/**
 * @openapi
 * /api/user/verify/{user_id}:
 *   post:
 *     tags: [User]
 *     summary: Verify a user account with OTP
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/verify", verifyUser);

/**
 * @openapi
 * /api/user/resend-otp/{user_id}:
 *   post:
 *     tags: [User]
 *     summary: Resend verification OTP to user
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/resend-otp", resendOtp);

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
 *         description: Returns availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 */
UserRoutes.get("/unique/:username", checkUsername);

/**
 * @openapi
 * /api/user/search:
 *   get:
 *     tags: [User]
 *     summary: Search for users by username or name
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       200:
 *         description: List of matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
UserRoutes.get("/search", optionalAuthMiddleware, searchUsers);

/**
 * @openapi
 * /api/user/me:
 *   patch:
 *     tags: [User]
 *     summary: Update current user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - avatar_url
 *               - is_active
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
 *                 success:
 *                   type: boolean
 */
UserRoutes.patch("/me", authMiddleware, updateCurrentUser);

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
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.get("/me", authMiddleware, getCurrentUser);

UserRoutes.post("/refresh", refreshAccessToken);

UserRoutes.post("/logout", logout);

export default UserRoutes;
