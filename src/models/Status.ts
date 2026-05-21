import mongoose, { Document, Schema, Types } from "mongoose";
import { Timestamps } from "@/types/timestamps.types";

export interface IStatusTextContent {
  text: string;
  gradient: string;
  font_size?: number;
}

export interface IStatusMediaContent {
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  thumbnail_url?: string;
}

export interface IStatusMoodContent {
  emoji: string;
  text: string;
  background_color: string;
}

export interface IStatusPollOption {
  text: string;
  votes: Types.ObjectId[];
}

export interface IStatusPollContent {
  question: string;
  options: IStatusPollOption[];
  ends_at?: Date;
}

export interface IStatusLinkContent {
  url: string;
  title?: string;
  description?: string;
  preview_image?: string;
  caption?: string;
}

export type IStatusContent =
  | IStatusTextContent
  | IStatusMediaContent
  | IStatusMoodContent
  | IStatusPollContent
  | IStatusLinkContent;

export interface IStatusView {
  user_id: Types.ObjectId;
  viewed_at: Date;
}

export interface IStatusReaction {
  user_id: Types.ObjectId;
  emoji: string;
  created_at: Date;
}

export interface IStatusComment {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  text: string;
  created_at: Date;
}

export type StatusType = "text" | "image" | "video" | "mood" | "poll" | "link";
export type StatusPrivacy =
  | "everyone"
  | "contacts"
  | "close_friends"
  | "custom"
  | "except";
export type StatusDuration = 6 | 12 | 24 | 48;

export interface IStatus extends Document, Timestamps {
  user_id: Types.ObjectId;
  type: StatusType;
  content: IStatusContent;
  privacy: StatusPrivacy;
  allowed_users: Types.ObjectId[];
  blocked_users: Types.ObjectId[];
  expires_at: Date;
  duration_hours: StatusDuration;
  views: IStatusView[];
  reactions: IStatusReaction[];
  comments: IStatusComment[];
  is_archived: boolean;
}

const statusViewSchema = new Schema<IStatusView>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    viewed_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusReactionSchema = new Schema<IStatusReaction>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusCommentSchema = new Schema<IStatusComment>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 500 },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

const statusSchema = new Schema<IStatus>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "mood", "poll", "link"],
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    privacy: {
      type: String,
      enum: ["everyone", "contacts", "close_friends", "custom", "except"],
      default: "contacts",
    },
    allowed_users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blocked_users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expires_at: {
      type: Date,
      required: true,
    },
    duration_hours: {
      type: Number,
      enum: [6, 12, 24, 48],
      default: 24,
    },
    views: [statusViewSchema],
    reactions: [statusReactionSchema],
    comments: [statusCommentSchema],
    is_archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

statusSchema.index({ user_id: 1, createdAt: -1 });
statusSchema.index({ expires_at: 1, is_archived: 1 });
statusSchema.index({ user_id: 1, expires_at: 1 });

export const Status =
  mongoose.models.Status || mongoose.model<IStatus>("Status", statusSchema);
