import { Message } from "@/models/Message";
import mongoose, { Types } from "mongoose";

export function getChatKey(user_id1: string, user_id2: string): string {
  const sortedIds = [user_id1, user_id2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

export async function getLastMessages(chatIds: unknown[]) {
  return Message.aggregate([
    { $match: { chat_id: { $in: chatIds } } },
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
    // Fetch all view records for the last message
    {
      $lookup: {
        from: "messageviews",
        localField: "lastMessage._id",
        foreignField: "message_id",
        as: "seen",
      },
    },
    {
      $project: {
        _id: 1,
        lastMessage: {
          _id: "$lastMessage._id",
          content: "$lastMessage.content",
          chat_id: "$lastMessage.chat_id",
          createdAt: "$lastMessage.createdAt",
          updatedAt: "$lastMessage.updatedAt",
          attachment: "$lastMessage.attachment",
          seen: {
            $map: {
              input: "$seen",
              as: "view",
              in: {
                user_id: "$$view.user_id",
                viewed_at: "$$view.viewed_at",
              },
            },
          },
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

export async function getUnreadCounts(
  chatIds: unknown[],
  viewerId: Types.ObjectId,
) {
  return Message.aggregate([
    {
      $match: {
        chat_id: { $in: chatIds },
        is_deleted: false,
        sender_id: { $ne: viewerId }, // exclude user's own messages
      },
    },
    {
      $lookup: {
        from: "messageviews",
        let: { msgId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$message_id", "$$msgId"] },
                  { $eq: ["$user_id", viewerId] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "viewRecord",
      },
    },
    {
      $match: { viewRecord: { $size: 0 } }, // only unread messages
    },
    {
      $group: {
        _id: "$chat_id",
        unread_count: { $sum: 1 },
      },
    },
  ]);
}

export function formatLastMessageSender(
  lastMessage: Record<string, unknown> | null,
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
    },
  };
}
