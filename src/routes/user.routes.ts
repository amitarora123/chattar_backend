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
} from "@/controllers/UserController";
import { optionalAuthMiddleware } from "@/middleware/auth.middleware";

const UserRoutes = Router();

UserRoutes.post("/", signup);
UserRoutes.post("/login", login);
UserRoutes.post("/google-login", googleLogin);
UserRoutes.post("/forgot-password", forgotPassword);
UserRoutes.post("/reset-password", resetPassword);
UserRoutes.post("/verify/:user_id", verifyUser);
UserRoutes.post("/resend-otp/:user_id", resendOtp);
UserRoutes.get("/unique/:username", checkUsername);
UserRoutes.get("/search", optionalAuthMiddleware, searchUsers);

export default UserRoutes;
