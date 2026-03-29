import { Request, Response } from "express";
import mongoose from "mongoose";
import { getChatKey } from "@/lib/service/chat";
import { Chat, ChatParticipants, IChat, IChatParticipants } from "@/models/Chat";
import { Contacts } from "@/models/Contact";
import { IMessage, Message } from "@/models/Message";
import { IUser } from "@/models/User";
import "@/models";

// GET /api/chats/me
export const getMyChats = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;

    const selfChatKey = getChatKey(
      authUser._id.toString(),
      authUser._id.toString(),
    );

    const chatParticipants = await ChatParticipants.find({
      user_id: authUser._id,
      left_at: null,
    })
      .populate("chat_id")
      .lean();

    const chatIds = chatParticipants.map((c) => c.chat_id._id);

    if (chatIds.length === 0) {
      return res.status(200).json([]);
    }

    const clearedAtMap = new Map(
      chatParticipants.map((cp) => [
        cp.chat_id._id.toString(),
        cp.cleared_at ?? null,
      ]),
    );

    const allParticipants = await ChatParticipants.find({
      chat_id: { $in: chatIds },
    })
      .populate("user_id")
      .lean();

    const contacts = await Contacts.find({ owner_id: authUser._id }).lean();

    const contactMap = new Map(
      contacts.map((c) => [c.user_id.toString(), c.name]),
    );

    const lastMessages = await Message.aggregate([
      { $match: { chat_id: { $in: chatIds }, is_deleted: false } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "sender_id",
          foreignField: "_id",
          as: "sender",
        },
      },
      { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$chat_id",
          lastMessage: {
            $first: {
              _id: "$_id",
              content: "$content",
              chat_id: "$chat_id",
              createdAt: "$createdAt",
              sender: {
                _id: "$sender._id",
                username: "$sender.username",
                avatar_url: "$sender.avatar_url",
              },
            },
          },
        },
      },
    ]);

    const lastMessageMap = new Map(
      lastMessages.map((m) => [m._id.toString(), m.lastMessage]),
    );

    const response = chatParticipants.map((cp) => {
      const chat = cp.chat_id as IChat;
      let lastMessage = lastMessageMap.get(chat._id.toString()) || null;

      const clearedAt = clearedAtMap.get(chat._id.toString());

      if (
        lastMessage &&
        clearedAt &&
        new Date(lastMessage.createdAt) <= new Date(clearedAt)
      ) {
        lastMessage = null;
      }

      if (lastMessage?.sender) {
        const senderId = lastMessage.sender._id.toString();

        lastMessage = {
          ...lastMessage,
          sender: {
            user: {
              _id: senderId,
              username: lastMessage.sender.username,
              avatar_url: lastMessage.sender.avatar_url ?? null,
            },
            groupRole: null,
            isContact: contactMap.has(senderId),
            contactName: contactMap.get(senderId) ?? null,
          },
        };
      }

      const participantsForChat = allParticipants.filter(
        (p) => p.chat_id.toString() === chat._id.toString(),
      );

      const formattedParticipants = participantsForChat
        .filter((p) => {
          if (!chat.is_group && chat.chat_key !== selfChatKey) {
            return p.user_id._id.toString() !== authUser._id.toString();
          }
          return true;
        })
        .map((p) => {
          const user = p.user_id as IUser;
          return {
            user: {
              _id: user._id.toString(),
              username: user.username,
              avatar_url: user.avatar_url ?? null,
            },
            groupRole: p.groupRole,
            isContact: contactMap.has(user._id.toString()),
            contactName: contactMap.get(user._id.toString()) ?? null,
          };
        });

      return {
        _id: chat._id.toString(),
        is_group: chat.is_group,
        groupMetaData: chat.is_group ? chat.groupMetaData : undefined,
        last_message: lastMessage,
        participants: formattedParticipants,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      };
    });

    return res.status(200).json(response);
  } catch (error) {
    console.log("User Chats Fetching Error:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// POST /api/chats/group
export const createGroup = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { memberIds, adminIds, name, description, avatar_url } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const group = await Chat.create({
      is_group: true,
      groupMetaData: {
        name,
        description,
        avatar_url,
        created_by: authUser._id,
      },
    });

    const participantsToInsert = [];

    participantsToInsert.push({
      chat_id: group._id,
      user_id: authUser._id,
      groupRole: { assigned_by: authUser._id, name: "Admin" },
    });

    if (adminIds?.length) {
      adminIds.forEach((id: string) => {
        participantsToInsert.push({
          chat_id: group._id,
          user_id: id,
          groupRole: { assigned_by: authUser._id, name: "Admin" },
        });
      });
    }

    if (memberIds?.length) {
      memberIds.forEach((id: string) => {
        participantsToInsert.push({
          chat_id: group._id,
          user_id: id,
          groupRole: { name: "Member", assigned_by: authUser._id },
        });
      });
    }

    const members = await ChatParticipants.insertMany(participantsToInsert);

    return res.status(200).json({ group, members });
  } catch (error) {
    console.log("Error creating group:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// GET /api/chats/:chat_id
export const getChatById = async (req: Request, res: Response) => {
  try {
    const { chat_id } = req.params;
    const authUser = req.authUser!;

    const chatParticipant = await ChatParticipants.findOne({
      user_id: authUser._id,
      left_at: null,
      chat_id,
    })
      .populate("chat_id")
      .lean();

    if (!chatParticipant) {
      return res
        .status(403)
        .json({ message: "User is not a participant of this chat" });
    }

    const chat = chatParticipant.chat_id;

    const participants = await ChatParticipants.find({
      chat_id,
      left_at: null,
    })
      .populate({ path: "user_id", select: "_id username avatar_url" })
      .select("user_id role")
      .lean();

    const contacts = await Contacts.find({ owner_id: authUser._id })
      .select("user_id name")
      .lean();

    const contactMap = new Map(
      contacts.map((c) => [c.user_id.toString(), c.name]),
    );

    const formattedParticipants = participants
      .filter((p) => {
        if (!chat.is_group) {
          return p.user_id._id.toString() !== authUser._id.toString();
        }
        return true;
      })
      .map((p) => {
        const userId = p.user_id._id.toString();
        return {
          user: {
            _id: userId,
            username: p.user_id.username,
            avatar_url: p.user_id.avatar_url ?? null,
          },
          role: p.role,
          isContact: contactMap.has(userId),
          contactName: contactMap.get(userId) ?? null,
        };
      });

    return res.status(200).json({ ...chat, participants: formattedParticipants });
  } catch (error) {
    console.error("Chat Fetch Error:", error);
    const { message } = error as { message?: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// GET /api/chats/:chat_id/messages
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const chat_id = req.params.chat_id as string;
    const recipient_id = req.query.recipient_id as string | undefined;
    const authUser = req.authUser!;

    let chat = null;

    if (chat_id && mongoose.Types.ObjectId.isValid(chat_id)) {
      chat = await Chat.findById(chat_id).lean();
    }

    if (!chat && recipient_id) {
      const chat_key = getChatKey(authUser._id.toString(), recipient_id);
      chat = await Chat.findOne({ chat_key }).lean();
    }

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const chatObjectId = new mongoose.Types.ObjectId(chat._id.toString());

    const chatParticipant = await ChatParticipants.findOne({
      chat_id: chatObjectId,
      user_id: authUser._id,
    }).lean();

    if (!chatParticipant) {
      return res
        .status(403)
        .json({ message: "Chat does not exist or access denied" });
    }

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

    const contacts = await Contacts.find(
      { owner_id: authUser._id },
      { user_id: 1, name: 1 },
    ).lean();

    const contactMap = new Map(
      contacts.map((c) => [c.user_id.toString(), c.name]),
    );

    const formattedMessages = messages.map((msg) => {
      const senderId = msg.sender_id?._id?.toString();
      return {
        _id: msg._id.toString(),
        content: msg.content,
        chat_id: msg.chat_id.toString(),
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        is_edited: msg.is_edited,
        is_deleted: msg.is_deleted,
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
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/chats/:chat_id/clear
export const clearChat = async (req: Request, res: Response) => {
  try {
    const chat_id = req.params.chat_id as string;
    const recipient_id = req.query.recipient_id as string | undefined;
    const authUser = req.authUser!;

    let chat = null;

    if (chat_id && mongoose.Types.ObjectId.isValid(chat_id)) {
      chat = await Chat.findById(chat_id);
    }

    if (!chat && recipient_id) {
      const chat_key = getChatKey(authUser._id.toString(), recipient_id);
      chat = await Chat.findOne({ chat_key });
    }

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const chatParticipant: IChatParticipants | null =
      await ChatParticipants.findOne({
        chat_id: chat._id,
        user_id: authUser._id,
      });

    if (!chatParticipant) {
      return res
        .status(403)
        .json({ message: "Chat not found or access denied" });
    }

    chatParticipant.cleared_at = new Date();
    await chatParticipant.save();

    return res.status(200).json({ message: "Chat Cleared Successfully" });
  } catch (error) {
    console.error("Chat Clear Error:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};
