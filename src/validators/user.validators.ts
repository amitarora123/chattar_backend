import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.object({
    username: z.string().optional(),
    email: z.string().optional(),
  }),
});

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string(),
    avatar_url: z.string(),
    is_active: z.boolean(),
  }),
});
