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
import { validate } from "@/middleware/validate.middleware";
import {
  signupSchema,
  loginSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyUserSchema,
  resendOtpSchema,
  searchUsersSchema,
  updateCurrentUserSchema,
  refreshAccessTokenSchema,
} from "@/validators/user.validators";

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
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 4
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User created, OTP sent for verification
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
 *                 isVerified:
 *                   type: boolean
 *                   example: false
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/sign-up", validate(signupSchema), signup);

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
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login response — success or verification required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - description: Login successful
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                 - description: Account not verified — OTP sent
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: User not Verified Please Verify your account
 *                     requiresVerification:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type: string
 *                         email:
 *                           type: string
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/login", validate(loginSchema), login);

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
 *             required: [id_token]
 *             properties:
 *               id_token:
 *                 type: string
 *                 description: Google ID token from the client
 *     responses:
 *       200:
 *         description: Login successful
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
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *       401:
 *         description: Invalid Google token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/google-login", validate(googleLoginSchema), googleLogin);

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
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset link sent if account exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: If an account exists, reset link sent.
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  forgotPassword,
);

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
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: password reset successfully
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword,
);

/**
 * @openapi
 * /api/user/verify:
 *   post:
 *     tags: [User]
 *     summary: Verify a user account with OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp, email]
 *             properties:
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Account verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/verify", validate(verifyUserSchema), verifyUser);

/**
 * @openapi
 * /api/user/resend-otp:
 *   post:
 *     tags: [User]
 *     summary: Resend verification OTP to user
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
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP Resend Successfully
 *                 resendAvailableAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Resend not yet available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post("/resend-otp", validate(resendOtpSchema), resendOtp);

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

/**
 * @openapi
 * /api/user/refresh:
 *   post:
 *     tags: [User]
 *     summary: Refresh access token using a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
UserRoutes.post(
  "/refresh",
  validate(refreshAccessTokenSchema),
  refreshAccessToken,
);

/**
 * @openapi
 * /api/user/logout:
 *   post:
 *     tags: [User]
 *     summary: Log out and invalidate the current access token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
UserRoutes.post("/logout", logout);

export default UserRoutes;
