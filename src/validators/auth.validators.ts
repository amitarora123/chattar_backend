import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    username: z.string().min(4, "Username must be at least 4 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const googleLoginSchema = z.object({
  body: z.object({
    code: z.string().min(1, "Authorization code is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

export const verifyUserSchema = z.object({
  body: z.object({
    otp: z.string().length(6, "OTP must be exactly 6 characters"),
    email: z.email("Invalid email address"),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
  }),
});
