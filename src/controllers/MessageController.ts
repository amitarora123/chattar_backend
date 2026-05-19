import { Request, Response } from "express";
import { Chat, ChatParticipants } from "@/models/Chat";
import {
  IMessage,
  Message,
  MessageReaction,
  MessageView,
} from "@/models/Message";
import mongoose, { isValidObjectId } from "mongoose";

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
        _id: message.sender_id?._id?.toString(),
        username: message.sender_id?.username,
        avatar_url: message.sender_id?.avatar_url,
      },
    };

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
      { content, is_edited: true },
      { new: true },
    ).populate("sender_id", "_id username display_name avatar_url last_seen");

    const chat_id = message.chat_id.toString();

    const formattedMessage = {
      _id: updatedMessage!._id.toString(),
      content: updatedMessage!.content,
      chat_id,
      createdAt: updatedMessage!.createdAt,
      updatedAt: updatedMessage!.updatedAt,
      is_edited: updatedMessage!.is_edited,
      is_deleted: updatedMessage!.is_deleted,
      attachment: updatedMessage!.attachment,
      seen: [],
      sender: {
        _id: updatedMessage!.sender_id?._id?.toString(),
        username: updatedMessage!.sender_id?.username,
        display_name: updatedMessage!.sender_id?.display_name ?? null,
        avatar_url: updatedMessage!.sender_id?.avatar_url ?? null,
        last_seen: updatedMessage!.sender_id?.last_seen ?? null,
      },
    };
    return res.status(200).json({
      message: "message updated successfully",
      data: formattedMessage,
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

    const { offset, limit } = req.query;

    const parsedOffset = Number(offset) || 0;
    const parsedLimit = Number(limit) || 30;

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
    };

    if (chatParticipant.cleared_at) {
      messageQuery.createdAt = { $gt: chatParticipant.cleared_at };
    }

    const total = await Message.countDocuments(messageQuery);

    const messages = await Message.find(messageQuery)
      .populate("sender_id", "username avatar_url")
      .populate({
        path: "reply_to_id",
        select: "_id content is_deleted attachment sender_id",
        populate: {
          path: "sender_id",
          select: "_id username avatar_url",
        },
      })
      .sort({ createdAt: -1 })
      .skip(parsedOffset)
      .limit(parsedLimit)
      .lean();

    const messageIds = messages.map((msg) => msg._id);

    const [messageViews, messageReactions] = await Promise.all([
      MessageView.find({ message_id: { $in: messageIds } })
        .select("message_id user_id viewed_at")
        .lean(),
      MessageReaction.find({ message_id: { $in: messageIds } })
        .select("message_id participant_id reaction")
        .lean(),
    ]);

    const viewsMap = new Map<string, { user_id: string; viewed_at: Date }[]>();
    for (const view of messageViews) {
      const mid = view.message_id.toString();
      if (!viewsMap.has(mid)) viewsMap.set(mid, []);
      viewsMap
        .get(mid)!
        .push({ user_id: view.user_id.toString(), viewed_at: view.viewed_at });
    }

    const reactionsMap = new Map<string, Map<string, string[]>>();
    for (const r of messageReactions) {
      const mid = r.message_id.toString();
      if (!reactionsMap.has(mid)) reactionsMap.set(mid, new Map());
      const emojiMap = reactionsMap.get(mid)!;
      if (!emojiMap.has(r.reaction)) emojiMap.set(r.reaction, []);
      emojiMap.get(r.reaction)!.push(r.participant_id.toString());
    }

    const formattedMessages = messages.reverse().map((msg) => {
      const messageId = msg._id.toString();
      const emojiMap = reactionsMap.get(messageId);
      const reactions = emojiMap
        ? Array.from(emojiMap.entries()).map(([emoji, userIds]) => ({
            emoji,
            count: userIds.length,
            userIds,
          }))
        : [];

      return {
        _id: messageId,
        content: msg.content,
        chat_id: msg.chat_id.toString(),
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        is_edited: msg.is_edited,
        is_deleted: msg.is_deleted,
        attachment: msg.attachment,
        seen: viewsMap.get(messageId) ?? [],
        reactions,
        reply_to: msg.reply_to_id
          ? {
              _id: msg.reply_to_id._id.toString(),
              content: msg.reply_to_id.content,
              is_deleted: msg.reply_to_id.is_deleted,
              attachment: msg.reply_to_id.attachment ?? null,
              sender: {
                _id: msg.reply_to_id.sender_id?._id?.toString() ?? null,
                username: msg.reply_to_id.sender_id?.username ?? null,
                avatar_url: msg.reply_to_id.sender_id?.avatar_url ?? null,
              },
            }
          : null,
        sender: {
          _id: msg.sender_id?._id?.toString(),
          username: msg.sender_id?.username,
          avatar_url: msg.sender_id?.avatar_url,
        },
      };
    });

    return res.status(200).json({
      data: formattedMessages,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + parsedLimit < total, // 👈
      },
    });
  } catch (error) {
    console.log("Error fetching messages:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/messages/chat/:chat_id/search?q=text
export const searchMessages = async (req: Request, res: Response) => {
  try {
    const chat_id = req.params.chat_id;
    const authUser = req.authUser!;
    const { q } = req.query;

    const chat = await Chat.findById(chat_id);
    if (!chat) return res.status(404).json({ message: "Chat Not Found" });

    const chatObjectId = new mongoose.Types.ObjectId(chat._id.toString());

    const chatParticipant = await ChatParticipants.findOne({
      chat_id: chatObjectId,
      user_id: authUser._id,
    }).lean();

    if (!chatParticipant)
      return res
        .status(403)
        .json({ message: "User is not the chat participant" });

    const messageQuery: Record<string, unknown> = {
      chat_id: chatObjectId,
      is_deleted: false,
      content: { $regex: q as string, $options: "i" },
    };

    if (chatParticipant.cleared_at) {
      messageQuery.createdAt = { $gt: chatParticipant.cleared_at };
    }

    const messages = await Message.find(messageQuery)
      .populate("sender_id", "username avatar_url")
      .populate({
        path: "reply_to_id",
        select: "_id content is_deleted attachment sender_id",
        populate: { path: "sender_id", select: "_id username avatar_url" },
      })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    const messageIds = messages.map((msg) => msg._id);
    const messageViews = await MessageView.find({
      message_id: { $in: messageIds },
    })
      .select("message_id user_id viewed_at")
      .lean();

    const viewsMap = new Map<string, { user_id: string; viewed_at: Date }[]>();
    for (const view of messageViews) {
      const mid = view.message_id.toString();
      if (!viewsMap.has(mid)) viewsMap.set(mid, []);
      viewsMap
        .get(mid)!
        .push({ user_id: view.user_id.toString(), viewed_at: view.viewed_at });
    }

    const formattedMessages = messages.map((msg) => {
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
        seen: viewsMap.get(messageId) ?? [],
        reply_to: msg.reply_to_id
          ? {
              _id: msg.reply_to_id._id.toString(),
              content: msg.reply_to_id.content,
              is_deleted: msg.reply_to_id.is_deleted,
              attachment: msg.reply_to_id.attachment ?? null,
              sender: {
                _id: msg.reply_to_id.sender_id?._id?.toString() ?? null,
                username: msg.reply_to_id.sender_id?.username ?? null,
                avatar_url: msg.reply_to_id.sender_id?.avatar_url ?? null,
              },
            }
          : null,
        sender: {
          _id: msg.sender_id?._id?.toString(),
          username: msg.sender_id?.username,
          avatar_url: msg.sender_id?.avatar_url,
        },
      };
    });

    return res.status(200).json({ data: formattedMessages });
  } catch (error) {
    console.log("Error searching messages:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/messages/chat/:chat_id/attachments
export const getChatAttachments = async (req: Request, res: Response) => {
  try {
    const chat_id = req.params.chat_id;
    const authUser = req.authUser!;

    const chat = await Chat.findById(chat_id);
    if (!chat) return res.status(404).json({ message: "Chat Not Found" });

    const chatObjectId = new mongoose.Types.ObjectId(chat._id.toString());

    const isMember = await ChatParticipants.exists({
      chat_id: chatObjectId,
      user_id: authUser._id,
    });

    if (!isMember)
      return res
        .status(403)
        .json({ message: "User is not the chat participant" });

    const messages = await Message.find({
      chat_id: chatObjectId,
      attachment: { $exists: true, $ne: null },
      is_deleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("sender_id", "username avatar_url")
      .lean();

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id.toString(),
      content: msg.content,
      chat_id: msg.chat_id.toString(),
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      is_edited: msg.is_edited,
      is_deleted: msg.is_deleted,
      attachment: msg.attachment,
      seen: [],
      reply_to: null,
      sender: {
        _id: msg.sender_id?._id?.toString(),
        username: msg.sender_id?.username,
        avatar_url: msg.sender_id?.avatar_url,
      },
    }));

    return res.status(200).json({ data: formattedMessages });
  } catch (error) {
    console.log("Error fetching chat attachments:", error);
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
