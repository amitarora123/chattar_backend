import { Request, Response } from "express";
import { Call } from "@/models/Call";
import User from "@/models/User";

export const getPendingCall = async (req: Request, res: Response) => {
  const userId = req.authUser!._id;
  const call = await Call.findOne({ callee_id: userId, status: "ringing" })
    .populate("caller_id", "_id username display_name avatar_url")
    .lean();

  if (!call) return res.json({ call: null });

  const caller = call.caller_id as unknown as {
    _id: { toString(): string };
    username: string;
    display_name?: string;
    avatar_url?: string;
  };

  res.json({
    call: {
      call_id: call._id.toString(),
      chat_id: call.chat_id.toString(),
      type: call.type,
      offer: call.offer ?? null,
      from_user: {
        _id: caller._id?.toString(),
        username: caller.username,
        display_name: caller.display_name,
        avatar_url: caller.avatar_url,
      },
    },
  });
};

export const getCallHistory = async (req: Request, res: Response) => {
  const userId = req.authUser!._id;
  const { chat_id } = req.query;
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = 20;

  const filter: Record<string, unknown> = {
    $or: [{ caller_id: userId }, { callee_id: userId }],
  };
  if (chat_id) filter.chat_id = chat_id;

  const [calls, total] = await Promise.all([
    Call.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("caller_id", "_id username display_name avatar_url")
      .populate("callee_id", "_id username display_name avatar_url")
      .lean(),
    Call.countDocuments(filter),
  ]);

  res.json({ calls, total, page, pages: Math.ceil(total / limit) });
};
