import { Timestamps } from '@/types/timestamps.types';
import mongoose, { Document, Schema } from 'mongoose';

interface IOtp {
  code: string;
  expiresIn: Date;
  resendAvailableAt: Date;
}

interface IPasswordReset {
  token: string;
  expiresIn: Date;
}

export interface IUser extends Document, Timestamps {
  username: string;
  display_name?: string;
  email: string;
  password?: string;
  avatar_url?: string;
  last_seen?: Date;
  is_active: boolean;
  isVerified: boolean;
  otp?: IOtp;
  password_reset?: IPasswordReset;
}

const otpSchema = new Schema<IOtp>(
  {
    code: {
      type: String,
      required: true,
      maxLength: 6,
      minLength: 6,
    },
    expiresIn: {
      type: Date,
      required: true,
    },

    resendAvailableAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
);

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    expiresIn: {
      type: Date,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      min: 4,
    },
    display_name: {
      type: String,
      required: false,
      min: 4,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
    },
    avatar_url: {
      type: String,
      required: false,
    },
    last_seen: {
      type: Date,
      required: false,
    },
    is_active: {
      type: Boolean,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: otpSchema,
    password_reset: passwordResetSchema,
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
