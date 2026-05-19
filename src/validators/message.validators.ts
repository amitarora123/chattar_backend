import { z } from "zod";

export const getChatMessagesSchema = z.object({
  params: z.object({
    chat_id: z.string().min(1, "chat_id is required"),
  }),
  query: z.object({
    limit: z.coerce.number().min(1, "minimum 1 limit is required").optional(),
    offset: z.coerce
      .number()
      .min(0, "offset should be non-negative")
      .optional(),
  }),
});

export const searchMessagesSchema = z.object({
  params: z.object({
    chat_id: z.string().min(1, "chat_id is required"),
  }),
  query: z.object({
    q: z.string().min(1, "Search query is required"),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    chat_id: z.string().min(1, "chat_id is required"),
  }),
  body: z.object({
    content: z.string().optional(),
    attachment: z.unknown().optional(),
    reply_to: z.string().optional(),
    is_group: z.boolean().optional(),
  }),
});

export const updateMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required"),
  }),
  params: z.object({
    message_id: z.string().min(1, "message_id is required"),
  }),
});
