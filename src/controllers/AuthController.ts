import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import User, { IUser } from "@/models/User";
import {
  generateUniqueUsername,
  generateOtp,
  generateExpiresIn,
  getSecondsLeft,
  generateRefreshToken,
  generateAccessToken,
} from "@/lib/utils/auth";
import { sendOtp, sendResetPasswordEmail } from "@/lib/utils/email";
import jwt from "jsonwebtoken";
import { User as AuthUser } from "@/types/user.types";
import BlockedToken from "@/models/BlockedToken";

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

// POST /api/auth/sign-up
export const signup = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOtp().toString();
    const expiresIn = generateExpiresIn(5);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      otp: {
        code: otpCode,
        expiresIn: new Date(expiresIn),
        resendAvailableAt: new Date(Date.now() + 60 * 1000),
      },
    });

    sendOtp(email, otpCode);

    return res.status(201).json({
      username,
      email,
      _id: user._id,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
    });
  } catch (error) {
    console.log("Error registering user:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user: IUser | null = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    if (!user.isVerified) {
      const otp = generateOtp().toString();
      user.otp = {
        code: otp,
        expiresIn: new Date(generateExpiresIn(5)),
        resendAvailableAt: new Date(Date.now() + 60 * 1000),
      };
      await user.save();
      sendOtp(user.email, otp);
      return res.status(200).json({
        message: "User not Verified Please Verify your account",
        requiresVerification: true,
        user: { user_id: user._id, email: user.email },
      });
    }

    const userDetails: AuthUser = {
      _id: user._id.toString(),
      username: user.username,
      avatar_url: user.avatar_url || "",
      display_name: user.display_name || "",
      email: user.email,
    };

    const refreshToken = generateRefreshToken(userDetails);
    const accessToken = generateAccessToken(userDetails);

    return res.status(200).json({
      ...userDetails,
      refreshToken,
      accessToken,
      avatar_url: user.avatar_url,
    });
  } catch (error) {
    console.log("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/auth/google-login
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { id_token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.AUTH_GOOGLE_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    let user = await User.findOne({ email: payload.email });

    if (user && !user.avatar_url) {
      user.avatar_url = payload.picture;
      await user.save();
    }

    if (!user) {
      const baseUsername = payload.email.split("@")[0];
      const uniqueUsername = await generateUniqueUsername(baseUsername);

      user = await User.create({
        email: payload.email,
        username: uniqueUsername,
        display_name: payload.name,
        avatar_url: payload.picture,
        isVerified: true,
        is_active: true,
      });
    }

    const userDetails: AuthUser = {
      _id: user._id.toString(),
      username: user.username,
      avatar_url: user.avatar_url || "",
      display_name: user.display_name || "",
      email: user.email,
    };
    const refreshToken = generateRefreshToken(userDetails);
    const accessToken = generateAccessToken(userDetails);

    return res.status(200).json({
      refreshToken,
      accessToken,
      ...userDetails,
      avatar_url: user.avatar_url,
    });
  } catch (error) {
    console.error("Google login error:", error);
    const { message } = error as { message: string };
    return res
      .status(401)
      .json({ message: message || "Authentication failed" });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user: IUser | null = await User.findOne({ email });

    if (user) {
      const expiresIn = generateExpiresIn(15);
      const token = jwt.sign(
        { user_id: user._id },
        process.env.RESET_PASSWORD_SECRET!,
        {
          expiresIn: "15m",
        },
      );

      user.password_reset = {
        expiresIn: new Date(expiresIn),
        token,
      };

      await user.save();

      sendResetPasswordEmail(
        user.email,
        `https://chattar-frontend-wusw.vercel.app/auth/reset-password?token=${token}`,
      );
    }

    return res
      .status(200)
      .json({ message: "If an account exists, reset link sent." });
  } catch (error) {
    console.log("Error in forgot-password:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET!) as {
      user_id: string;
    };

    if (!decoded || !decoded.user_id) {
      return res.status(400).json({ message: "Invalid token or expired" });
    }

    const user: IUser | null = await User.findById(decoded.user_id);

    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const { password_reset } = user;

    if (
      !password_reset ||
      !password_reset.token ||
      password_reset.token !== token ||
      password_reset.expiresIn <= new Date()
    ) {
      return res.status(400).json({ message: "Invalid or Expired token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.password_reset = undefined;
    await user.save();

    return res.status(200).json({ message: "password reset successfully" });
  } catch (error) {
    console.log("Error in reset-password:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/auth/verify
export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { otp, email }: { otp: string; email: string } = req.body;

    const user = (await User.findOne({ email })) as IUser;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp) {
      return res
        .status(400)
        .json({ message: "OTP Invalid or Used, Request a new one" });
    }

    if (user.otp.code !== otp || user.otp.expiresIn.valueOf() < Date.now()) {
      return res.status(400).json({ message: "Invalid or Expired otp" });
    }

    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    return res.status(200).json({ message: "User verified successfully" });
  } catch (error) {
    console.log("Error verifying user:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/auth/resend-otp
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user: IUser | null = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp && user.otp.resendAvailableAt > new Date()) {
      return res.status(400).json({
        message: `Please Wait for ${getSecondsLeft(user.otp.resendAvailableAt)} to get next resend`,
      });
    }

    const otp = generateOtp().toString();
    const expiresIn = generateExpiresIn(5);

    user.otp = {
      code: otp,
      expiresIn: new Date(expiresIn),
      resendAvailableAt: new Date(Date.now() + 60 * 1000),
    };

    await user.save();
    sendOtp(user.email, otp);

    return res.status(200).json({
      message: "OTP Resend Successfully",
      resendAvailableAt: user.otp.resendAvailableAt,
    });
  } catch (error) {
    console.log("Error resending otp:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/auth/refresh
export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as AuthUser;

    if (!decodedToken) {
      return res.status(400).json({ message: "Invalid Refresh Token" });
    }

    const user = await User.findById(decodedToken._id)
      .select("_id username email avatar_url")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userDetails: AuthUser = {
      _id: user._id.toString(),
      username: user.username,
      avatar_url: user.avatar_url || "",
      display_name: user.display_name || "",
      email: user.email,
    };
    const accessToken = generateAccessToken(userDetails);
    const newRefreshToken = generateRefreshToken(userDetails);

    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url ?? null,
    });
  } catch (error) {
    console.log("Error while Refreshing Token: ", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Something Went wrong" });
  }
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response) => {
  try {
    const accessToken = (req.headers["authorization"] as string)?.split(" ")[1];

    if (accessToken) {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      if (decoded?.exp) {
        await BlockedToken.create({
          token: accessToken,
          expiresAt: new Date(decoded.exp * 1000),
        });
      }
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Logout error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
