import mongoose from "mongoose";
import {
  Chat,
  ChatParticipants,
  IChat,
  IChatParticipants,
} from "@/models/Chat";
import { Contacts } from "@/models/Contact";
import { Message } from "@/models/Message";
import { IUser } from "@/models/User";
import "@/models";

export function getChatKey(user_id1: string, user_id2: string): string {
  const sortedIds = [user_id1, user_id2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

async function buildContactMap(ownerId: unknown): Promise<Map<string, string>> {
  const contacts = await Contacts.find({ owner_id: ownerId }).lean();
  return new Map(contacts.map((c) => [c.user_id.toString(), c.name ?? ""]));
}

async function getLastMessages(chatIds: unknown[]) {
  return Message.aggregate([
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
}

function formatLastMessageSender(
  lastMessage: Record<string, unknown> | null,
  contactMap: Map<string, string>,
) {
  if (!lastMessage?.sender) return lastMessage;

  const sender = lastMessage.sender as Record<string, unknown>;
  const senderId = (sender._id as mongoose.Types.ObjectId)?.toString();

  return {
    ...lastMessage,
    sender: {
      user: {
        _id: senderId,
        username: sender.username,
        avatar_url: sender.avatar_url ?? null,
      },
      groupRole: null,
      isContact: contactMap.has(senderId),
      contactName: contactMap.get(senderId) ?? null,
    },
  };
}

export async function getUserChats(authUser: { _id: string }) {
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

  return chatParticipants.map((cp) => {
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
}

export async function createGroup(
  authUser: { _id: string },
  body: {
    memberIds?: string[];
    adminIds?: string[];
    name: string;
    description?: string;
    avatar_url?: string;
  },
) {
  const { memberIds, adminIds, name, description, avatar_url } = body;

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

  return { group, members };
}

export async function getChatById(chat_id: string, authUser: { _id: string }) {
  const chatParticipant = await ChatParticipants.findOne({
    user_id: authUser._id,
    left_at: null,
    chat_id,
  })
    .populate("chat_id")
    .lean();

  if (!chatParticipant) return null;

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

  return { ...chat, participants: formattedParticipants };
}

export async function getChatMessages(
  chat_id: string,
  recipient_id: string | undefined,
  authUser: { _id: string },
) {
  let chat: IChat | null = null;

  if (chat_id && mongoose.Types.ObjectId.isValid(chat_id)) {
    chat = await Chat.findById(chat_id).lean();
  }

  if (!chat && recipient_id) {
    const chat_key = getChatKey(authUser._id.toString(), recipient_id);
    chat = await Chat.findOne({ chat_key }).lean();
  }

  if (!chat) return null;

  const chatObjectId = new mongoose.Types.ObjectId(chat._id.toString());

  const chatParticipant = await ChatParticipants.findOne({
    chat_id: chatObjectId,
    user_id: authUser._id,
  }).lean();

  if (!chatParticipant) return "forbidden";

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

  const contactMap = await buildContactMap(authUser._id);

  return messages.map((msg) => {
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
}

export async function clearChat(
  chat_id: string,
  recipient_id: string | undefined,
  authUser: { _id: string },
): Promise<"not_found" | "forbidden" | "ok"> {
  let chat: IChat | null = null;

  if (chat_id && mongoose.Types.ObjectId.isValid(chat_id)) {
    chat = await Chat.findById(chat_id);
  }

  if (!chat && recipient_id) {
    const chat_key = getChatKey(authUser._id.toString(), recipient_id);
    chat = await Chat.findOne({ chat_key });
  }

  if (!chat) return "not_found";

  const chatParticipant: IChatParticipants | null =
    await ChatParticipants.findOne({
      chat_id: chat._id,
      user_id: authUser._id,
    });

  if (!chatParticipant) return "forbidden";

  chatParticipant.cleared_at = new Date();
  await chatParticipant.save();

  return "ok";
}
