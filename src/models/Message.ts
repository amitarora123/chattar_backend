import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessageAttachment {
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface IMessage extends Document {
  chat_id: Types.ObjectId;
  sender_id: Types.ObjectId;
  content: string;
  reply_to_id: Types.ObjectId;
  is_edited: boolean;
  is_deleted: boolean;
  attachment?: IMessageAttachment;
}

export interface IMessageReactions extends Document {
  message_id: Types.ObjectId;
  participant_id: Types.ObjectId;
  reaction: string;
}

export interface IMessageViews extends Document {
  message_id: Types.ObjectId;
  participant_id: Types.ObjectId;
  viewed_at: Date;
}

const messageViewsSchema = new Schema<IMessageViews>(
  {
    message_id: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    participant_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewed_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  },
);

// Useful for fetching all viewers of a message
messageViewsSchema.index({ message_id: 1 });

// Prevent duplicate view records for the same user and message
messageViewsSchema.index(
  { message_id: 1, participant_id: 1 },
  { unique: true },
);

export const MessageView =
  mongoose.models.MessageView ||
  mongoose.model<IMessageViews>("MessageView", messageViewsSchema);

const messageAttachmentSchema = new Schema<IMessageAttachment>(
  {
    file_size: Number,
    file_url: String,
    file_type: String,
  },
  {
    _id: false,
  },
);

const messageSchema = new Schema<IMessage>(
  {
    chat_id: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    reply_to_id: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: false,
    },
    is_edited: {
      type: Boolean,
      required: false,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      required: false,
      default: false,
    },
    attachment: {
      type: messageAttachmentSchema,
      required: false,
    },
  },
  { timestamps: true },
);

messageSchema.index({ chat_id: 1, createdAt: -1 });

const messageReactionSchema = new Schema<IMessageReactions>({
  message_id: {
    type: Schema.Types.ObjectId,
    ref: "Message",
    required: true,
  },
  participant_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reaction: {
    type: String,
    required: true,
  },
});

messageReactionSchema.index({ message_id: 1 });

messageReactionSchema.index(
  { message_id: 1, participant_id: 1 },
  { unique: true },
);

export const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export const MessageReaction =
  mongoose.models.MessageReaction ||
  mongoose.model("MessageReaction", messageReactionSchema);
