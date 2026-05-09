import { Request, Response } from "express";

import {
  Chat,
  ChatParticipants,
  IChat,
  IChatParticipants,
} from "@/models/Chat";
import {
  buildContactMap,
  formatLastMessageSender,
  getChatKey,
  getLastMessages,
} from "@/lib/utils/chat";
import User, { IUser } from "@/models/User";

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

    if (chatIds.length === 0) return [];

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

    const contactMap = await buildContactMap(authUser._id);

    const lastMessages = await getLastMessages(chatIds);
    const lastMessageMap = new Map(
      lastMessages.map((m) => [m._id.toString(), m.lastMessage]),
    );

    const chats = chatParticipants.map((cp) => {
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

      lastMessage = formatLastMessageSender(lastMessage, contactMap);

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
    return res.json(chats);
  } catch (error) {
    console.log("User Chats Fetching Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/chats/group
export const createGroup = async (req: Request, res: Response) => {
  try {
    const { memberIds, adminIds, name, description, avatar_url } = req.body;
    const authUser = req.authUser!;

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
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/chats/:chat_id
export const getChatById = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const chat_id = req.params.chat_id;

    const chatParticipant = await ChatParticipants.findOne({
      user_id: authUser._id,
      left_at: null,
      chat_id,
    })
      .populate("chat_id")
      .lean();

    if (!chatParticipant)
      return res.status(403).json({
        message: "User is not participant for this chat",
      });

    const chat = chatParticipant.chat_id;

    const participants = await ChatParticipants.find({
      chat_id,
      left_at: null,
    })
      .populate({ path: "user_id", select: "_id username avatar_url" })
      .select("user_id role")
      .lean();

    const contactMap = await buildContactMap(authUser._id);

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

    return res
      .status(200)
      .json({ ...chat, participants: formattedParticipants });
  } catch (error) {
    console.error("Chat Fetch Error:", error);
    const { message } = error as { message?: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/chats/recipient/:recipient_id
export const getRecipientInfo = async (req: Request, res: Response) => {
  try {
    const recipient_id = req.params.recipient_id;
    const authUser = req.authUser!;

    const user = await User.findById(recipient_id)
      .select("_id username display_name avatar_url last_seen is_active")
      .lean();

    if (!user)
      return res.status(404).json({
        message: "Recipient Not Found",
      });

    const contactMap = await buildContactMap(authUser._id);
    const userId = user._id.toString();

    const recipientInfo = {
      user: {
        _id: userId,
        username: user.username,
        display_name: user.display_name ?? null,
        avatar_url: user.avatar_url ?? null,
        last_seen: user.last_seen ?? null,
        is_active: user.is_active,
      },
      isContact: contactMap.has(userId),
      contactName: contactMap.get(userId) ?? null,
    };

    if (!recipientInfo) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    return res.status(200).json(recipientInfo);
  } catch (error) {
    console.error("Recipient Info Fetch Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/chats/:chat_id/clear
export const clearChat = async (req: Request, res: Response) => {
  try {
    const chat_id = req.params.chat_id;
    const authUser = req.authUser!;

    const chat = await Chat.findById(chat_id);

    if (!chat)
      return res.status(404).json({
        message: "Chat Not Found",
      });

    const chatParticipant: IChatParticipants | null =
      await ChatParticipants.findOne({
        chat_id: chat._id,
        user_id: authUser._id,
      });

    if (!chatParticipant)
      return res.status(403).json({
        message: "User is not participant of the chat",
      });

    chatParticipant.cleared_at = new Date();
    await chatParticipant.save();

    return res.status(200).json({ message: "Chat Cleared Successfully" });
  } catch (error) {
    console.error("Chat Clear Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

export const createSingleChat = async (req: Request, res: Response) => {
  try {
    const { recipient_id } = req.body;

    const user_id = req.authUser!._id;

    const chat_key = getChatKey(recipient_id, user_id);

    const existingChat = await Chat.findOne({
      chat_key,
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // create the chat participants

    const newChat: IChat = await Chat.create({
      chat_key,
    });

    await ChatParticipants.create({
      chat_id: newChat._id,
      user_id,
    });

    await ChatParticipants.create({
      chat_id: recipient_id,
      user_id,
    });

    return res.json(newChat);
  } catch (error) {
    const { message } = error as { message: string };
    console.log("Error Creating Single Chat: ", message);
    return res.status(500).json({
      message,
    });
  }
};
