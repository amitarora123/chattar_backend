import { isValidObjectId } from "mongoose";
import { Chat, ChatParticipants, IChat } from "@/models/Chat";
import { Message } from "@/models/Message";
import { getChatKey } from "@/services/ChatService";
import { getIO } from "@/lib/socket/server";

export async function sendMessage(
  authUser: { _id: string },
  body: {
    chat_id?: string;
    recipient_id?: string;
    content?: string;
    attachment?: unknown;
    reply_to?: string;
    is_group?: boolean;
  },
): Promise<
  | { error: "bad_request"; message: string }
  | { error: "not_found" }
  | { error: "forbidden" }
  | { message: IChat; data: unknown }
> {
  const { chat_id, recipient_id, content, attachment, reply_to, is_group } =
    body;

  let chat: IChat | null = null;

  if (is_group) {
    if (!chat_id || !isValidObjectId(chat_id)) {
      return { error: "bad_request", message: "chat_id is required for group" };
    }
    chat = await Chat.findOne({ _id: chat_id, is_group: true });
  } else {
    if (!chat_id || !isValidObjectId(chat_id)) {
      if (!recipient_id || !isValidObjectId(recipient_id)) {
        return {
          error: "bad_request",
          message: "recipient_id is required to create chat",
        };
      }

      const chat_key = getChatKey(authUser._id.toString(), recipient_id);
      chat = await Chat.findOne({ chat_key, is_group: false });

      if (!chat) {
        chat = (await Chat.create({ chat_key })) as IChat;

        await ChatParticipants.create({
          chat_id: chat._id,
          user_id: authUser._id,
        });

        if (recipient_id !== authUser._id.toString()) {
          await ChatParticipants.create({
            chat_id: chat._id,
            user_id: recipient_id,
          });
        }
      }
    } else {
      chat = await Chat.findById(chat_id);
    }
  }

  if (!chat) return { error: "not_found" };

  const isMember = await ChatParticipants.exists({
    chat_id: chat._id,
    user_id: authUser._id,
  });

  if (!isMember) return { error: "forbidden" };

  const message = await Message.create({
    chat_id: chat._id,
    sender_id: authUser._id,
    content: content || "",
    reply_to_id: isValidObjectId(reply_to) ? reply_to : undefined,
    attachment,
  });

  await message.populate("sender_id", "username avatar_url");

  const io = getIO();

  const formattedMessage = {
    _id: message._id.toString(),
    content: message.content,
    chat_id: message.chat_id.toString(),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    is_edited: message.is_edited,
    is_deleted: message.is_deleted,
    sender: {
      user: {
        _id: message.sender_id?._id?.toString(),
        username: message.sender_id?.username,
        avatar_url: message.sender_id?.avatar_url,
      },
      isContact: false,
      contactName: null,
    },
  };

  if (chat.is_group) {
    io.to(`chat:${chat._id}`).emit("message:new", formattedMessage);
  } else {
    io.to(`chat:${chat.chat_key}`).emit("message:new", formattedMessage);
  }

  return { message: chat, data: message };
}

export async function updateMessage(
  message_id: string,
  content: string,
  authUser: { _id: string },
): Promise<"not_found" | unknown> {
  const message = await Message.findOne({
    _id: message_id,
    sender_id: authUser._id,
  });

  if (!message) return "not_found";

  return Message.findByIdAndUpdate(message_id, { content }, { new: true });
}

export async function deleteMessage(
  message_id: string,
  authUser: { _id: string },
): Promise<"not_found" | "ok"> {
  const message = await Message.findOne({
    _id: message_id,
    sender_id: authUser._id,
  });

  if (!message) return "not_found";

  await Message.findByIdAndUpdate(message_id, { is_deleted: true });

  return "ok";
}
