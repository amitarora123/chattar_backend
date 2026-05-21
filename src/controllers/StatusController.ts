import { Request, Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import { Status, IStatus } from "@/models/Status";
import { ChatParticipants } from "@/models/Chat";
import { getIO } from "@/lib/socket/server";

const STATUS_REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

async function getContactIds(userId: string): Promise<string[]> {
  const myChatIds = await ChatParticipants.distinct("chat_id", {
    user_id: userId,
    left_at: null,
  });
  const contactIds = await ChatParticipants.distinct("user_id", {
    chat_id: { $in: myChatIds },
    user_id: { $ne: new Types.ObjectId(userId) },
    left_at: null,
  });
  return contactIds.map((id) => id.toString());
}

function buildPrivacyFilter(userId: string) {
  const userObjId = new Types.ObjectId(userId);
  return {
    $or: [
      { privacy: "everyone" },
      { privacy: "contacts" },
      {
        privacy: { $in: ["close_friends", "custom"] },
        allowed_users: userObjId,
      },
      { privacy: "except", blocked_users: { $ne: userObjId } },
    ],
  };
}

function formatStatus(status: IStatus & { _id: Types.ObjectId }) {
  return {
    _id: status._id.toString(),
    user_id: status.user_id.toString(),
    type: status.type,
    content: status.content,
    privacy: status.privacy,
    allowed_users: status.allowed_users.map((id) => id.toString()),
    blocked_users: status.blocked_users.map((id) => id.toString()),
    expires_at: status.expires_at,
    duration_hours: status.duration_hours,
    views: status.views.map((v) => ({
      user_id: v.user_id.toString(),
      viewed_at: v.viewed_at,
    })),
    reactions: status.reactions.map((r) => ({
      user_id: r.user_id.toString(),
      emoji: r.emoji,
      created_at: r.created_at,
    })),
    comments: status.comments.map((c) => ({
      _id: c._id.toString(),
      user_id: c.user_id.toString(),
      text: c.text,
      created_at: c.created_at,
    })),
    is_archived: status.is_archived,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
  };
}

// GET /api/status/feed
export const getFeed = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const contactIds = await getContactIds(userId);

    if (contactIds.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const now = new Date();
    const privacyFilter = buildPrivacyFilter(userId);

    const statuses = await Status.find({
      user_id: { $in: contactIds.map((id: string) => new Types.ObjectId(id)) },
      is_archived: false,
      expires_at: { $gt: now },
      $and: [privacyFilter],
    })
      .sort({ user_id: 1, createdAt: 1 })
      .populate("user_id", "_id username avatar_url display_name")
      .lean();

    const groupMap = new Map<
      string,
      {
        user: Record<string, unknown>;
        statuses: unknown[];
        hasUnviewed: boolean;
      }
    >();

    for (const s of statuses) {
      const userField = s.user_id as unknown as Record<string, unknown>;
      const ownerId = String((userField as { _id?: unknown })._id ?? s.user_id);
      const hasViewed = s.views.some(
        (v: { user_id: Types.ObjectId }) => v.user_id.toString() === userId,
      );

      if (!groupMap.has(ownerId)) {
        groupMap.set(ownerId, {
          user: userField,
          statuses: [],
          hasUnviewed: false,
        });
      }

      const group = groupMap.get(ownerId)!;
      group.statuses.push({
        _id: s._id.toString(),
        user_id: ownerId,
        type: s.type,
        content: s.content,
        privacy: s.privacy,
        allowed_users: s.allowed_users.map((id: Types.ObjectId) =>
          id.toString(),
        ),
        blocked_users: s.blocked_users.map((id: Types.ObjectId) =>
          id.toString(),
        ),
        expires_at: s.expires_at,
        duration_hours: s.duration_hours,
        views: s.views.map(
          (v: { user_id: Types.ObjectId; viewed_at: Date }) => ({
            user_id: v.user_id.toString(),
            viewed_at: v.viewed_at,
          }),
        ),
        reactions: s.reactions.map(
          (r: {
            user_id: Types.ObjectId;
            emoji: string;
            created_at: Date;
          }) => ({
            user_id: r.user_id.toString(),
            emoji: r.emoji,
            created_at: r.created_at,
          }),
        ),
        comments: s.comments.map(
          (c: {
            _id: Types.ObjectId;
            user_id: Types.ObjectId;
            text: string;
            created_at: Date;
          }) => ({
            _id: c._id.toString(),
            user_id: c.user_id.toString(),
            text: c.text,
            created_at: c.created_at,
          }),
        ),
        is_archived: s.is_archived,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      });

      if (!hasViewed) group.hasUnviewed = true;
    }

    const feed = Array.from(groupMap.values());
    return res.status(200).json({ data: feed });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/status/me
export const getMyStatuses = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const now = new Date();

    const statuses = await Status.find({
      user_id: userId,
      expires_at: { $gt: now },
      is_archived: false,
    }).sort({ createdAt: 1 });

    return res.status(200).json({ data: statuses.map(formatStatus) });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/status
export const createStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const {
      type,
      content,
      privacy,
      allowed_users,
      blocked_users,
      duration_hours,
    } = req.body;

    const durationMs = (duration_hours ?? 24) * 60 * 60 * 1000;
    const expires_at = new Date(Date.now() + durationMs);

    const status = await Status.create({
      user_id: userId,
      type,
      content,
      privacy: privacy ?? "contacts",
      allowed_users: allowed_users ?? [],
      blocked_users: blocked_users ?? [],
      expires_at,
      duration_hours: duration_hours ?? 24,
    });

    await status.populate("user_id", "_id username avatar_url display_name");

    const formatted = formatStatus(status);

    const contactIds = await getContactIds(userId);
    if (contactIds.length > 0) {
      const io = getIO();
      contactIds.forEach((contactId) => {
        io.to(`user:${contactId}`).emit("status:new", {
          status: formatted,
          authorId: userId,
        });
      });
    }

    return res.status(201).json({ message: "Status created", data: formatted });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/status/:status_id
export const deleteStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const status = await Status.findOneAndDelete({
      _id: status_id,
      user_id: userId,
    });

    if (!status) {
      return res
        .status(404)
        .json({ message: "Status not found or not authorized" });
    }

    const contactIds = await getContactIds(userId);
    if (contactIds.length > 0) {
      const io = getIO();
      contactIds.forEach((contactId) => {
        io.to(`user:${contactId}`).emit("status:delete", {
          status_id,
          authorId: userId,
        });
      });
    }

    return res.status(200).json({ message: "Status deleted" });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/status/:status_id/view
export const viewStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const status = await Status.findOneAndUpdate(
      { _id: status_id, "views.user_id": { $ne: new Types.ObjectId(userId) } },
      {
        $push: {
          views: { user_id: new Types.ObjectId(userId), viewed_at: new Date() },
        },
      },
      { new: true },
    );

    if (!status) {
      return res.status(200).json({ message: "Already viewed" });
    }

    const view = { user_id: userId, viewed_at: new Date().toISOString() };

    try {
      const io = getIO();
      io.to(`user:${status.user_id.toString()}`).emit("status:view", {
        status_id,
        view,
      });
    } catch {
      // socket not critical
    }

    return res.status(200).json({ message: "Viewed" });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/status/:status_id/react
export const reactToStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);
    const { emoji } = req.body;

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    if (!STATUS_REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ message: "Invalid emoji" });
    }

    const status = await Status.findById(status_id);
    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    const userObjId = new Types.ObjectId(userId);
    const existingIndex = status.reactions.findIndex(
      (r: { user_id: Types.ObjectId }) => r.user_id.toString() === userId,
    );

    if (existingIndex !== -1) {
      if (status.reactions[existingIndex].emoji === emoji) {
        status.reactions.splice(existingIndex, 1);
      } else {
        status.reactions[existingIndex].emoji = emoji;
        status.reactions[existingIndex].created_at = new Date();
      }
    } else {
      status.reactions.push({
        user_id: userObjId,
        emoji,
        created_at: new Date(),
      });
    }

    await status.save();

    const reactions = status.reactions.map(
      (r: { user_id: Types.ObjectId; emoji: string; created_at: Date }) => ({
        user_id: r.user_id.toString(),
        emoji: r.emoji,
        created_at: r.created_at,
      }),
    );

    try {
      const io = getIO();
      io.to(`user:${status.user_id.toString()}`).emit("status:react", {
        status_id,
        reactions,
      });
    } catch {
      // socket not critical
    }

    return res.status(200).json({ data: reactions });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/status/:status_id/comment
export const commentOnStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);
    const { text } = req.body;

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const comment = {
      _id: new Types.ObjectId(),
      user_id: new Types.ObjectId(userId),
      text,
      created_at: new Date(),
    };

    const status = await Status.findByIdAndUpdate(
      status_id,
      { $push: { comments: comment } },
      { new: true },
    );

    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    const formattedComment = {
      _id: comment._id.toString(),
      user_id: userId,
      text,
      created_at: comment.created_at,
    };

    try {
      const io = getIO();
      io.to(`user:${status.user_id.toString()}`).emit("status:comment", {
        status_id,
        comment: formattedComment,
      });
    } catch {
      // socket not critical
    }

    return res.status(201).json({ data: formattedComment });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/status/:status_id/comment/:comment_id
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);
    const comment_id = String(req.params.comment_id);

    if (!isValidObjectId(status_id) || !isValidObjectId(comment_id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const status = await Status.findById(status_id);
    if (!status) {
      return res.status(404).json({ message: "Status not found" });
    }

    const commentIndex = status.comments.findIndex(
      (c: { _id: Types.ObjectId }) => c._id.toString() === comment_id,
    );

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const comment = status.comments[commentIndex];
    const isStatusOwner = status.user_id.toString() === userId;
    const isCommentOwner = comment.user_id.toString() === userId;

    if (!isStatusOwner && !isCommentOwner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    status.comments.splice(commentIndex, 1);
    await status.save();

    return res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/status/:status_id/viewers
export const getStatusViewers = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const status = await Status.findOne({
      _id: status_id,
      user_id: userId,
    }).populate("views.user_id", "_id username avatar_url display_name");

    if (!status) {
      return res
        .status(404)
        .json({ message: "Status not found or not authorized" });
    }

    return res.status(200).json({
      data: {
        views: status.views,
        reactions: status.reactions.map(
          (r: {
            user_id: Types.ObjectId;
            emoji: string;
            created_at: Date;
          }) => ({
            user_id: r.user_id.toString(),
            emoji: r.emoji,
            created_at: r.created_at,
          }),
        ),
        total_views: status.views.length,
      },
    });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/status/archive
export const getArchivedStatuses = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const statuses = await Status.find({ user_id: userId, is_archived: true })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return res.status(200).json({ data: statuses.map(formatStatus) });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/status/:status_id/archive
export const archiveStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const status = await Status.findOneAndUpdate(
      { _id: status_id, user_id: userId },
      { is_archived: true },
      { new: true },
    );

    if (!status) {
      return res
        .status(404)
        .json({ message: "Status not found or not authorized" });
    }

    return res
      .status(200)
      .json({ message: "Status archived", data: formatStatus(status) });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/status/:status_id/repost
export const repostStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const original = await Status.findOne({ _id: status_id, user_id: userId });
    if (!original) {
      return res
        .status(404)
        .json({ message: "Status not found or not authorized" });
    }

    const expires_at = new Date(
      Date.now() + original.duration_hours * 60 * 60 * 1000,
    );

    const reposted = await Status.create({
      user_id: userId,
      type: original.type,
      content: original.content,
      privacy: original.privacy,
      allowed_users: original.allowed_users,
      blocked_users: original.blocked_users,
      expires_at,
      duration_hours: original.duration_hours,
    });

    const formatted = formatStatus(reposted);

    const contactIds = await getContactIds(userId);
    if (contactIds.length > 0) {
      const io = getIO();
      contactIds.forEach((contactId) => {
        io.to(`user:${contactId}`).emit("status:new", {
          status: formatted,
          authorId: userId,
        });
      });
    }

    return res
      .status(201)
      .json({ message: "Status reposted", data: formatted });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/status/:status_id/poll/vote
export const voteOnPoll = async (req: Request, res: Response) => {
  try {
    const userId = req.authUser!._id;
    const status_id = String(req.params.status_id);
    const { option_index } = req.body;

    if (!isValidObjectId(status_id)) {
      return res.status(400).json({ message: "Invalid status id" });
    }

    const status = await Status.findById(status_id);
    if (!status || status.type !== "poll") {
      return res.status(404).json({ message: "Poll status not found" });
    }

    const content = status.content as {
      question: string;
      options: { text: string; votes: Types.ObjectId[] }[];
    };

    if (option_index < 0 || option_index >= content.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    const userObjId = new Types.ObjectId(userId);

    for (let i = 0; i < content.options.length; i++) {
      const voteIndex = content.options[i].votes.findIndex(
        (v) => v.toString() === userId,
      );
      if (voteIndex !== -1) {
        content.options[i].votes.splice(voteIndex, 1);
      }
    }

    content.options[option_index].votes.push(userObjId);
    status.markModified("content");
    await status.save();

    try {
      const io = getIO();
      io.to(`user:${status.user_id.toString()}`).emit("status:poll_vote", {
        status_id,
        option_index,
        votes: content.options[option_index].votes.map((v) => v.toString()),
      });
    } catch {
      // socket not critical
    }

    return res.status(200).json({ data: content });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};
