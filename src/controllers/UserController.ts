import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User, { IUser } from "@/models/User";
import { Contacts } from "@/models/Contact";
import mongoose from "mongoose";
import {
  generateUniqueUsername,
  generateOtp,
  generateExpiresIn,
  getSecondsLeft,
  createUser,
} from "@/services/UserService";
import { sendOtp, sendResetPasswordEmail } from "@/services/EmailService";

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

// POST /api/user
export const signup = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "password must be at least 6 chars" });
    }

    const user = await createUser({ username, email, password });

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

// POST /api/user/login
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

    const userDetails = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };

    const token = jwt.sign(userDetails, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return res
      .status(200)
      .json({ ...userDetails, token, avatar_url: user.avatar_url });
  } catch (error) {
    console.log("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/user/google-login
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { id_token } = req.body;

    if (!id_token) {
      return res.status(400).json({ message: "ID token is required" });
    }

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

    const userDetails = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };

    const token = jwt.sign(userDetails, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return res
      .status(200)
      .json({ token, ...userDetails, avatar_url: user.avatar_url });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

// POST /api/user/forgot-password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user: IUser | null = await User.findOne({ email });

    if (user) {
      const expiresIn = generateExpiresIn(15);
      const token = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET!, {
        expiresIn,
      });

      user.password_reset = {
        expiresIn: new Date(expiresIn),
        token,
      };

      await user.save();

      sendResetPasswordEmail(
        user.email,
        `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`,
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

// POST /api/user/reset-password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "All Fields are required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
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

// POST /api/user/verify/:user_id
export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { otp }: { otp: string } = req.body;

    if (
      !user_id ||
      !mongoose.isValidObjectId(user_id) ||
      !otp ||
      otp.length !== 6
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = (await User.findById(user_id)) as IUser;

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

// POST /api/user/resend-otp/:user_id
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    const user: IUser | null = await User.findById(user_id);

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

// GET /api/user/search
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { username, email } = req.query;
    const authUser = req.authUser;

    const query: Record<string, unknown> = {};

    if (username) {
      query.username = { $regex: `^${username}`, $options: "i" };
    }

    if (email) {
      query.email = { $regex: `^${email}`, $options: "i" };
    }

    const users = await User.find(query)
      .select("_id username avatar_url")
      .lean();

    let contactMap: Map<string, string> = new Map();

    if (authUser) {
      const contacts = await Contacts.find({ owner_id: authUser._id }).lean();
      contactMap = new Map(
        contacts.map((c) => [c.user_id.toString(), c.name ?? ""]),
      );
    }

    const response = users.map((user) => ({
      user: {
        _id: user._id.toString(),
        username: user.username,
        avatar_url: user.avatar_url ?? null,
      },
      role: undefined,
      isContact: contactMap.has(user._id.toString()),
      contactName: contactMap.get(user._id.toString()),
    }));

    return res.status(200).json(response);
  } catch (error) {
    console.log("Error Searching Users:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/user/unique/:username
export const checkUsername = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }).select("-password").lean();
    return res.status(200).json(!user);
  } catch (error) {
    console.log("Error while fetching username:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Something Went Wrong" });
  }
};

export const updateCurrentUser = async (req: Request, res: Response) => {
  const { name, avatar_url, is_active } = req.body;
  const { _id } = req.authUser || {};

  console.log(name, avatar_url, is_active);

  try {
    await User.findByIdAndUpdate(_id, {
      display_name: name,
      avatar_url,
      is_active,
    });

    return res.status(200).json({
      message: "details updated successfully",
      success: true,
    });
  } catch (error) {
    const { message } = error as { message: string };

    console.log("Error updating user:", error);

    return res.status(500).json({
      success: false,
      message: message || "Internal Server Error",
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const { _id } = req.authUser!;

  try {
    const user = await User.findById(_id).select(
      "-password -otp -password_reset",
    );
    return res.json(user);
  } catch (error) {
    console.log("Error while fetching current user: ", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Something Went wrong" });
  }
};
