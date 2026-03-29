import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  createContact,
  getMyContacts,
  getContact,
  updateContact,
  deleteContact,
} from "@/controllers/ContactController";

const ContactRoutes = Router();

ContactRoutes.use(authMiddleware);

ContactRoutes.post("/", createContact);
ContactRoutes.get("/me", getMyContacts);
ContactRoutes.get("/:contact_id", getContact);
ContactRoutes.put("/:contact_id", updateContact);
ContactRoutes.delete("/:contact_id", deleteContact);

export default ContactRoutes;
