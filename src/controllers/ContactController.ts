import { Request, Response } from "express";
import { Contacts, IContacts } from "@/models/Contact";
import User from "@/models/User";

// POST /api/contacts
export const createContact = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { username, name } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Contact is not using chatty" });
    }

    const contact = await Contacts.create({
      owner_id: authUser._id,
      user_id: user._id,
      name,
    });

    return res.status(201).json(contact.toObject());
  } catch (error) {
    console.log("Contact Creation Error:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// GET /api/contacts/me
export const getMyContacts = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;

    const userContacts: IContacts[] = await Contacts.find({
      owner_id: authUser._id,
    })
      .populate("user_id")
      .select("-user_id.otp -user_id.password -user_id.password_reset")
      .lean();

    const formattedUserContacts = userContacts.map((c) => ({
      _id: c._id,
      name: c.name,
      user: c.user_id,
    }));

    return res.status(200).json(formattedUserContacts);
  } catch (error) {
    console.log("User Contact fetching Error:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// GET /api/contacts/:contact_id
export const getContact = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { contact_id } = req.params;

    const existingContact = await Contacts.findOne({
      _id: contact_id,
      owner_id: authUser._id,
    })
      .select("-__v")
      .populate({ path: "user_id", select: "-password -__v" })
      .lean();

    if (!existingContact) {
      return res.status(404).json({ message: "No Contact found by this id" });
    }

    const { user_id, ...rest } = existingContact;
    return res.status(200).json({ ...rest, user: user_id });
  } catch (error) {
    console.log("Error Getting Contact:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// PUT /api/contacts/:contact_id
export const updateContact = async (req: Request, res: Response) => {
  try {
    const { contact_id } = req.params;
    const { name } = req.body;

    const existingContact = await Contacts.findByIdAndUpdate(
      contact_id,
      { $set: { name } },
      { new: true },
    ).lean();

    if (!existingContact) {
      return res
        .status(404)
        .json({ message: "No Existing Contact found by this id" });
    }

    return res.status(200).json(existingContact);
  } catch (error) {
    console.log("Error updating Contact:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/contacts/:contact_id
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { contact_id } = req.params;

    const contact = await Contacts.findOne({
      _id: contact_id,
      owner_id: authUser._id,
    });

    if (!contact) {
      return res
        .status(404)
        .json({ message: "Contact Not Found with given id" });
    }

    await Contacts.deleteOne({ _id: contact_id });

    return res.status(200).json({ message: "Contact Deleted Successfully" });
  } catch (error) {
    console.log("Error Deleting Contact:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Internal Server Error" });
  }
};
