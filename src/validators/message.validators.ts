import { z } from "zod";

export const getChatMessagesSchema = z.object({
  params: z.object({
    chat_id: z.string().min(1, "chat_id is required"),
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
