import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  createContact,
  getMyContacts,
  getContact,
  updateContact,
  deleteContact,
} from "@/controllers/ContactController";
import { validate } from "@/middleware/validate.middleware";
import {
  createContactSchema,
  updateContactSchema,
} from "@/validators/contact.validators";

const ContactRoutes = Router();

ContactRoutes.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   name: Contacts
 *   description: Contact management
 */

/**
 * @openapi
 * /api/contacts:
 *   post:
 *     tags: [Contacts]
 *     summary: Add a new contact
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username of the user to add as contact
 *               name:
 *                 type: string
 *                 description: Display name for the contact
 *     responses:
 *       201:
 *         description: Contact created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: User not found or not on the platform
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ContactRoutes.post("/", validate(createContactSchema), createContact);

/**
 * @openapi
 * /api/contacts/me:
 *   get:
 *     tags: [Contacts]
 *     summary: Get all contacts for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contact'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ContactRoutes.get("/me", getMyContacts);

/**
 * @openapi
 * /api/contacts/{contact_id}:
 *   get:
 *     tags: [Contacts]
 *     summary: Get a contact by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contact_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ContactRoutes.get("/:contact_id", getContact);

/**
 * @openapi
 * /api/contacts/{contact_id}:
 *   put:
 *     tags: [Contacts]
 *     summary: Update a contact's display name
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contact_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ContactRoutes.put("/:contact_id", validate(updateContactSchema), updateContact);

/**
 * @openapi
 * /api/contacts/{contact_id}:
 *   delete:
 *     tags: [Contacts]
 *     summary: Delete a contact
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contact_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contact Deleted Successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Contact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ContactRoutes.delete("/:contact_id", deleteContact);

export default ContactRoutes;
