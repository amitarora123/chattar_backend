import { Request, Response } from "express";
import { Call } from "@/models/Call";
import User from "@/models/User";

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
