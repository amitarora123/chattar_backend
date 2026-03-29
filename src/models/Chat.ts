import { Timestamps } from "@/types/timestamps.types";
import mongoose, { Document, Schema, Types } from "mongoose";

interface IGroupMetaData {
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: Types.ObjectId;
}

export interface IChat extends Document, Timestamps {
  is_group: boolean;
  chat_key?: string;
  groupMetaData?: IGroupMetaData;
}

export interface IGroupRole {
  assigned_by: Types.ObjectId;
  name: "Admin" | "Member";
  assigned_at?: Date;
}

export interface IChatParticipants extends Document {
  chat_id: Types.ObjectId;
  user_id: Types.ObjectId;
  is_muted?: boolean;
  joined_at?: Date;
  left_at?: Date;
  cleared_at?: Date;
  groupRole?: IGroupRole;
}

const groupMetaDataSchema = new Schema<IGroupMetaData>(
  {
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      minlength: 3,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    avatar_url: {
      type: String,
      required: false,
    },
  },
  { _id: false },
);

const chatSchema = new Schema<IChat>(
  {
    is_group: {
      type: Boolean,
      default: false,
      required: true,
    },
    chat_key: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    groupMetaData: {
      type: groupMetaDataSchema,
      required: false,
    },
  },
  { timestamps: true },
);

const groupRoleSchema = new Schema<IGroupRole>(
  {
    assigned_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      enum: ["Admin", "Member"],
    },
    assigned_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const chatParticipantsSchema = new Schema<IChatParticipants>(
  {
    chat_id: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joined_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    left_at: {
      type: Date,
      required: false,
    },
    is_muted: {
      type: Boolean,
      default: false,
      required: false,
    },
    cleared_at: {
      type: Date,
      required: false,
    },
    groupRole: groupRoleSchema,
  },
  { timestamps: true },
);

chatParticipantsSchema.index({ chat_id: 1 });

chatParticipantsSchema.index({ user_id: 1 });

chatParticipantsSchema.index({ chat_id: 1, user_id: 1 }, { unique: true });

export const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
export const ChatParticipants =
  mongoose.models.ChatParticipants ||
  mongoose.model("ChatParticipants", chatParticipantsSchema);
