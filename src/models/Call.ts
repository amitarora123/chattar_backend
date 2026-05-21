import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICall extends Document {
  caller_id: Types.ObjectId;
  callee_id: Types.ObjectId;
  chat_id: Types.ObjectId;
  type: "audio" | "video";
  status: "ringing" | "answered" | "declined" | "missed" | "ended";
  started_at: Date;
  ended_at?: Date;
  duration?: number;
}

const callSchema = new Schema<ICall>(
  {
    caller_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    callee_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    chat_id: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    type: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["ringing", "answered", "declined", "missed", "ended"],
      default: "ringing",
    },
    started_at: { type: Date, default: Date.now },
    ended_at: { type: Date },
    duration: { type: Number },
  },
  { timestamps: true },
);

callSchema.index({ caller_id: 1, createdAt: -1 });
callSchema.index({ callee_id: 1, createdAt: -1 });
callSchema.index({ chat_id: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>("Call", callSchema);
