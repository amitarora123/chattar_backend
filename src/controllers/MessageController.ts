import { Request, Response } from "express";
import { Chat, ChatParticipants } from "@/models/Chat";
import { IMessage, Message, MessageView } from "@/models/Message";
import mongoose, { isValidObjectId } from "mongoose";
import { getIO } from "@/lib/socket/server";
import { buildContactMap } from "@/lib/utils/chat";

// POST /api/messages
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { content, attachment, reply_to } = req.body;
    const authUser = req.authUser!;
    const chat_id = req.params.chat_id;

    const chat = await Chat.findOne({
      _id: chat_id,
    });

    if (!chat)
      return res.status(404).json({
        message: "Chat Not Found",
      });

    const isMember = await ChatParticipants.exists({
      chat_id: chat._id,
      user_id: authUser._id,
    });

    if (!isMember)
      return res.status(403).json({
        message: "User is not participant in the chat",
      });

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
      attachment: message.attachment,
      seen: [],
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
      data: formattedMessage,
    });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// PUT /api/messages/:message_id
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { message_id } = req.params;
    const { content } = req.body;
    const authUser = req.authUser!;

    const message = await Message.findById(message_id);

    if (!message) {
      return res.status(404).json({
        message: "message not found with this id",
      });
    }

    if (message.sender_id !== authUser._id) {
      return res.status(403).json({
        message: "User is not authorized to update this message",
      });
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      message_id,
      { content },
      { new: true },
    );

    return res.status(200).json({
      message: "message updated successfully",
      ...updatedMessage,
    });
  } catch (error) {
    console.log("message Update Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/messages/:message_id
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { message_id } = req.params;
    const authUser = req.authUser!;

    const message = await Message.findById(message_id);

    if (!message) {
      return res.status(404).json({
        message: "message not found with this id",
      });
    }

    if (message.sender_id !== authUser._id) {
      return res.status(403).json({
        message: "User is not authorized to delete this message",
      });
    }

    await Message.findByIdAndUpdate(message_id, { is_deleted: true });

    return res.status(200).json({ message: "Message Deleted Successfully" });
  } catch (error) {
    console.log("Message Delete Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/messages/:chat_id/messages
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const chat_id = req.params.chat_id;
    const authUser = req.authUser!;

    const chat = await Chat.findById(chat_id);

    if (!chat)
      return res.status(404).json({
        message: "Chat Not Found",
      });

    const chatObjectId = new mongoose.Types.ObjectId(chat._id.toString());

    const chatParticipant = await ChatParticipants.findOne({
      chat_id: chatObjectId,
      user_id: authUser._id,
    }).lean();

    if (!chatParticipant)
      return res.status(403).json({
        message: "User is not the chat participant",
      });

    const messageQuery: Record<string, unknown> = {
      chat_id: chatObjectId,
      is_deleted: false,
    };

    if (chatParticipant.cleared_at) {
      messageQuery.createdAt = { $gt: chatParticipant.cleared_at };
    }

    const messages = await Message.find(messageQuery)
      .populate("sender_id", "username avatar_url")
      .sort({ createdAt: 1 })
      .lean();

    // Get all message IDs
    const messageIds = messages.map((msg) => msg._id);

    // Fetch all seen records for these messages
    const messageViews = await MessageView.find({
      message_id: { $in: messageIds },
    })
      .select("message_id user_id viewed_at")
      .lean();

    // Group views by message_id
    const viewsMap = new Map<
      string,
      {
        participant_id: string;
        viewed_at: Date;
      }[]
    >();

    for (const view of messageViews) {
      const messageId = view.message_id.toString();

      if (!viewsMap.has(messageId)) {
        viewsMap.set(messageId, []);
      }

      viewsMap.get(messageId)!.push({
        participant_id: view.user_id.toString(),
        viewed_at: view.viewed_at,
      });
    }

    const contactMap = await buildContactMap(authUser._id);

    const formattedMessages = messages.map((msg) => {
      const senderId = msg.sender_id?._id?.toString();
      const messageId = msg._id.toString();

      return {
        _id: messageId,
        content: msg.content,
        chat_id: msg.chat_id.toString(),
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        is_edited: msg.is_edited,
        is_deleted: msg.is_deleted,
        attachment: msg.attachment,

        // Seen information
        seen: viewsMap.get(messageId) ?? [],

        sender: {
          user: {
            _id: senderId,
            username: msg.sender_id?.username,
            avatar_url: msg.sender_id?.avatar_url,
          },
          isContact: senderId ? contactMap.has(senderId) : false,
          contactName: senderId ? contactMap.get(senderId) : undefined,
        },
      };
    });

    return res.status(200).json(formattedMessages);
  } catch (error) {
    console.log("Error fetching messages:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

export const viewMessage = async (req: Request, res: Response) => {
  try {
    const message_id = req.params.message_id;
    const authUser = req.authUser!;

    const message: IMessage | null = await Message.findById(message_id);

    if (!message) {
      return res.status(404).json({
        message: "message not found",
      });
    }

    const chat_id = message.chat_id;

    const chatParticipant = await ChatParticipants.findOne({
      chat_id,
      user_id: authUser._id,
      left_at: null,
    });

    if (!chatParticipant) {
      return res.status(403).json({
        message: "User is not participant of the chat",
      });
    }

    const messageView = await MessageView.create({
      user_id: authUser._id,
      message_id,
    });

    return res.status(201).json(messageView);
  } catch (error) {
    const { message } = error as { message: string };

    console.log("Error while viewing message: ", message);

    return res.status(500).json({
      message: message || "Internal Server Error",
    });
  }
};
