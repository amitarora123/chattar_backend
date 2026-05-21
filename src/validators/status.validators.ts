import { z } from "zod";

export const createStatusSchema = z.object({
  body: z.object({
    type: z.enum(["text", "image", "video", "mood", "poll", "link"]),
    content: z.record(z.string(), z.unknown()),
    privacy: z
      .enum(["everyone", "contacts", "close_friends", "custom", "except"])
      .default("contacts"),
    allowed_users: z.array(z.string()).optional(),
    blocked_users: z.array(z.string()).optional(),
    duration_hours: z
      .union([z.literal(6), z.literal(12), z.literal(24), z.literal(48)])
      .default(24),
  }),
});

export const statusIdParamSchema = z.object({
  params: z.object({
    status_id: z.string().min(1, "status_id is required"),
  }),
});

export const reactToStatusSchema = z.object({
  params: z.object({ status_id: z.string().min(1) }),
  body: z.object({
    emoji: z.enum(["❤️", "😂", "😮", "😢", "👍", "🔥"]),
  }),
});

export const commentOnStatusSchema = z.object({
  params: z.object({ status_id: z.string().min(1) }),
  body: z.object({
    text: z.string().min(1, "Comment cannot be empty").max(500),
  }),
});

export const deleteCommentSchema = z.object({
  params: z.object({
    status_id: z.string().min(1),
    comment_id: z.string().min(1),
  }),
});

export const voteOnPollSchema = z.object({
  params: z.object({ status_id: z.string().min(1) }),
  body: z.object({
    option_index: z.number().int().min(0),
  }),
});
