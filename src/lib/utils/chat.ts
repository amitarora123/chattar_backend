import { Contacts } from "@/models/Contact";
import { Message } from "@/models/Message";
import mongoose from "mongoose";

export function getChatKey(user_id1: string, user_id2: string): string {
  const sortedIds = [user_id1, user_id2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

export async function buildContactMap(
  ownerId: unknown,
): Promise<Map<string, string>> {
  const contacts = await Contacts.find({ owner_id: ownerId }).lean();
  return new Map(contacts.map((c) => [c.user_id.toString(), c.name ?? ""]));
}

export async function getLastMessages(chatIds: unknown[]) {
  return Message.aggregate([
    { $match: { chat_id: { $in: chatIds }, is_deleted: false } },
    { $sort: { chat_id: 1, createdAt: -1 } },
    {
      $group: {
        _id: "$chat_id",
        lastMessage: { $first: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "lastMessage.sender_id",
        foreignField: "_id",
        as: "sender",
      },
    },
    { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        lastMessage: {
          _id: "$lastMessage._id",
          content: "$lastMessage.content",
          chat_id: "$lastMessage.chat_id",
          createdAt: "$lastMessage.createdAt",
          attachment: "$lastMessage.attachment",
          sender: {
            _id: "$sender._id",
            username: "$sender.username",
            avatar_url: "$sender.avatar_url",
          },
        },
      },
    },
  ]);
}

export function formatLastMessageSender(
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
