import crypto from "crypto";
import bcrypt from "bcrypt";
import User, { IUser } from "@/models/User";
import { sendOtp } from "@/services/EmailService";
import jwt from "jsonwebtoken";
import { AuthUser } from "@/types/user.types";

interface CreateUserBody {
  username: string;
  email: string;
  password: string;
}

export async function generateUniqueUsername(base: string): Promise<string> {
  let username = base;
  let counter = 0;

  while (true) {
    const existingUser = await User.findOne({ username });
    if (!existingUser) break;
    counter++;
    username = `${base}-${counter}`;
  }

  return username;
}

export function generateOtp(): number {
  return crypto.randomInt(100000, 1000000);
}

export function generateExpiresIn(minutes: number): number {
  return Date.now() + minutes * 60 * 1000;
}

export function getSecondsLeft(timestamp: Date | string): number {
  const expiryTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.floor((expiryTime - now) / 1000);
  return Math.max(0, diff);
}

export async function createUser({
  username,
  email,
  password,
}: CreateUserBody): Promise<IUser> {
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

  return user;
}

export function generateRefreshToken(userDetails: AuthUser) {
  const refreshToken = jwt.sign(
    userDetails,
    process.env.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: "7d",
    },
  );
  return refreshToken;
}

export function generateAccessToken(userDetails: AuthUser) {
  const accessToken = jwt.sign(userDetails, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "5m",
  });

  return accessToken;
}
