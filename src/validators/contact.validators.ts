import { z } from "zod";

export const createContactSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Username is required"),
    name: z.string().optional(),
  }),
});

export const updateContactSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
  }),
  params: z.object({
    contact_id: z.string().min(1, "contact_id is required"),
  }),
});
