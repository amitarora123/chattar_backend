import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z
    .object({
      chat_id: z.string().optional(),
      recipient_id: z.string().optional(),
      content: z.string().optional(),
      attachment: z.unknown().optional(),
      reply_to: z.string().optional(),
      is_group: z.boolean().optional(),
    })
    .refine((data) => data.chat_id || data.recipient_id, {
      message: "Either chat_id or recipient_id is required",
      path: ["chat_id"],
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
