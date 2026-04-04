import { Contacts, IContacts } from "@/models/Contact";
import User from "@/models/User";

export async function createContact(
  authUser: { _id: string },
  { username, name }: { username: string; name?: string },
): Promise<IContacts | null> {
  const user = await User.findOne({ username });

  if (!user) return null;

  return Contacts.create({
    owner_id: authUser._id,
    user_id: user._id,
    name,
  });
}

export async function getMyContacts(authUser: { _id: string }) {
  const userContacts: IContacts[] = await Contacts.find({
    owner_id: authUser._id,
  })
    .populate("user_id")
    .select("-user_id.otp -user_id.password -user_id.password_reset")
    .lean();

  return userContacts.map((c) => ({
    _id: c._id,
    name: c.name,
    user: c.user_id,
  }));
}

export async function getContactById(
  contact_id: string,
  authUser: { _id: string },
) {
  const existingContact = await Contacts.findOne({
    _id: contact_id,
    owner_id: authUser._id,
  })
    .select("-__v")
    .populate({ path: "user_id", select: "-password -__v" })
    .lean();

  if (!existingContact) return null;

  const { user_id, ...rest } = existingContact;
  return { ...rest, user: user_id };
}

export async function updateContact(
  contact_id: string,
  { name }: { name: string },
) {
  return Contacts.findByIdAndUpdate(
    contact_id,
    { $set: { name } },
    { new: true },
  ).lean();
}

export async function deleteContact(
  contact_id: string,
  authUser: { _id: string },
): Promise<"not_found" | "ok"> {
  const contact = await Contacts.findOne({
    _id: contact_id,
    owner_id: authUser._id,
  });

  if (!contact) return "not_found";

  await Contacts.deleteOne({ _id: contact_id });

  return "ok";
}
