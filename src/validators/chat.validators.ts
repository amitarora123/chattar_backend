import { z } from "zod";

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Group name is required"),
    memberIds: z.array(z.string()).min(1, "At least one member is required"),
    adminIds: z.array(z.string()).optional(),
    description: z.string().optional(),
    avatar_url: z.string().optional(),
  }),
});

export const getChatMessagesSchema = z.object({
  params: z.object({
    chat_id: z.string().min(1, "chat_id is required"),
  }),
  query: z.object({
    recipient_id: z.string().optional(),
  }),
});

export const clearChatSchema = z.object({
  params: z.object({
    chat_id: z.string().min(1, "chat_id is required"),
  }),
  query: z.object({
    recipient_id: z.string().optional(),
  }),
});
