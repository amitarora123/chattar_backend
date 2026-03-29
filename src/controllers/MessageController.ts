import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Chat, ChatParticipants, IChat } from "@/models/Chat";
import { Message } from "@/models/Message";
import { getChatKey } from "@/lib/service/chat";
import { getIO } from "@/lib/socket/server";

// POST /api/messages
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { chat_id, recipient_id, content, attachment, reply_to, is_group } =
      req.body;

    let chat: IChat | null = null;

    if (is_group) {
      if (!chat_id || !isValidObjectId(chat_id)) {
        return res
          .status(400)
          .json({ message: "chat_id is required for group" });
      }
      chat = await Chat.findOne({ _id: chat_id, is_group: true });
    } else {
      if (!chat_id || !isValidObjectId(chat_id)) {
        if (!recipient_id || !isValidObjectId(recipient_id)) {
          return res
            .status(400)
            .json({ message: "recipient_id is required to create chat" });
        }

        const chat_key = getChatKey(authUser._id.toString(), recipient_id);
        chat = await Chat.findOne({ chat_key, is_group: false });

        if (!chat) {
          chat = (await Chat.create({ chat_key })) as IChat;

          await ChatParticipants.create({
            chat_id: chat._id,
            user_id: authUser._id,
          });

          if (recipient_id !== authUser._id) {
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

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const isMember = await ChatParticipants.exists({
      chat_id: chat._id,
      user_id: authUser._id,
    });

    if (!isMember) {
      return res.status(403).json({ message: "Not allowed in this chat" });
    }

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

    return res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// PUT /api/messages/:message_id
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { message_id } = req.params;
    const { content } = req.body;
    const authUser = req.authUser!;

    const message = await Message.findOne({
      _id: message_id,
      sender_id: authUser._id,
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      message_id,
      { content },
      { new: true },
    );

    return res.status(200).json(updatedMessage);
  } catch (error) {
    console.log("Message Update Error:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/messages/:message_id
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { message_id } = req.params;
    const authUser = req.authUser!;

    const message = await Message.findOne({
      _id: message_id,
      sender_id: authUser._id,
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    await Message.findByIdAndUpdate(message_id, { is_deleted: true });

    return res.status(200).json({ message: "Message Deleted Successfully" });
  } catch (error) {
    console.log("Message Delete Error:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};
