import { Request, Response } from "express";
import User from "@/models/User";
import { Contacts, IContacts } from "@/models/Contact";

// POST /api/contacts
export const createContact = async (req: Request, res: Response) => {
  try {
    const { username, name } = req.body;
    const user = await User.findOne({ username });
    const authUser = req.authUser!;

    if (!user)
      return res.status(404).json({
        message: "User not found",
      });

    const contact = await Contacts.create({
      owner_id: authUser._id,
      user_id: user._id,
      name,
    });

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
    const authUser = req.authUser!;

    const userContacts: IContacts[] = await Contacts.find({
      owner_id: authUser._id,
    })
      .populate("user_id")
      .select("-user_id.otp -user_id.password -user_id.password_reset")
      .lean();

    const result = userContacts.map((c) => ({
      _id: c._id,
      name: c.name,
      user: c.user_id,
    }));

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
export const getContactById = async (req: Request, res: Response) => {
  try {
    const contact_id = req.params.contact_id;
    const authUser = req.authUser!;

    const existingContact = await Contacts.findOne({
      _id: contact_id,
      owner_id: authUser._id,
    })
      .select("-__v")
      .populate({ path: "user_id", select: "-password -__v" })
      .lean();

    if (!existingContact) return null;

    const { user_id, ...rest } = existingContact;
    const result = { ...rest, user: user_id };

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
    const contact_id = req.params;
    const { name } = req.body;

    const result = await Contacts.findByIdAndUpdate(
      contact_id,
      { $set: { name } },
      { new: true },
    ).lean();

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
    const contact_id = req.params.contact_id;
    const authUser = req.authUser!;

    const contact = await Contacts.findOne({
      _id: contact_id,
      owner_id: authUser._id,
    });

    if (!contact)
      return res.status(404).json({
        message: "Contact Not Found",
      });

    await Contacts.deleteOne({ _id: contact_id });

    return res.status(200).json({ message: "Contact Deleted Successfully" });
  } catch (error) {
    console.log("Error Deleting Contact:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};
