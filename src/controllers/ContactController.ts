import { Request, Response } from "express";
import {
  createContact as createContactService,
  getMyContacts as getMyContactsService,
  getContactById,
  updateContact as updateContactService,
  deleteContact as deleteContactService,
} from "@/services/ContactService";

// POST /api/contacts
export const createContact = async (req: Request, res: Response) => {
  try {
    const { username, name } = req.body;
    const contact = await createContactService(req.authUser!, {
      username,
      name,
    });

    if (!contact) {
      return res.status(400).json({ message: "Contact is not using chatty" });
    }

    return res.status(201).json(contact.toObject());
  } catch (error) {
    console.log("Contact Creation Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/contacts/me
export const getMyContacts = async (req: Request, res: Response) => {
  try {
    const result = await getMyContactsService(req.authUser!);
    return res.status(200).json(result);
  } catch (error) {
    console.log("User Contact fetching Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/contacts/:contact_id
export const getContact = async (req: Request, res: Response) => {
  try {
    const result = await getContactById(
      req.params.contact_id as string,
      req.authUser!,
    );

    if (!result) {
      return res.status(404).json({ message: "No Contact found by this id" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.log("Error Getting Contact:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// PUT /api/contacts/:contact_id
export const updateContact = async (req: Request, res: Response) => {
  try {
    const result = await updateContactService(req.params.contact_id as string, {
      name: req.body.name,
    });

    if (!result) {
      return res
        .status(404)
        .json({ message: "No Existing Contact found by this id" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.log("Error updating Contact:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/contacts/:contact_id
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const result = await deleteContactService(
      req.params.contact_id as string,
      req.authUser!,
    );

    if (result === "not_found") {
      return res
        .status(404)
        .json({ message: "Contact Not Found with given id" });
    }

    return res.status(200).json({ message: "Contact Deleted Successfully" });
  } catch (error) {
    console.log("Error Deleting Contact:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};
