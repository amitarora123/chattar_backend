import { Request, Response } from "express";
import User from "@/models/User";
import { Contacts } from "@/models/Contact";

// GET /api/user/unique/:username
export const checkUsername = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }).select("-password").lean();
    return res.status(200).json(!user);
  } catch (error) {
    console.log("Error while fetching username:", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Something Went Wrong" });
  }
};

// GET /api/user/search
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { username, email } = req.query;
    const authUser = req.authUser;

    const query: Record<string, unknown> = {};

    if (username) {
      query.username = { $regex: `^${username}`, $options: "i" };
    }

    if (email) {
      query.email = { $regex: `^${email}`, $options: "i" };
    }

    const users = await User.find(query)
      .select("_id username avatar_url")
      .lean();

    let contactMap: Map<string, string> = new Map();

    if (authUser) {
      const contacts = await Contacts.find({ owner_id: authUser._id }).lean();
      contactMap = new Map(
        contacts.map((c) => [c.user_id.toString(), c.name ?? ""]),
      );
    }

    const response = users.map((user) => ({
      user: {
        _id: user._id.toString(),
        username: user.username,
        avatar_url: user.avatar_url ?? null,
      },
      role: undefined,
      isContact: contactMap.has(user._id.toString()),
      contactName: contactMap.get(user._id.toString()),
    }));

    return res.status(200).json(response);
  } catch (error) {
    console.log("Error Searching Users:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// PATCH /api/user/me
export const updateCurrentUser = async (req: Request, res: Response) => {
  const { name, avatar_url, is_active } = req.body;
  const { _id } = req.authUser || {};

  try {
    await User.findByIdAndUpdate(_id, {
      display_name: name,
      avatar_url,
      is_active,
    });

    return res.status(200).json({
      message: "details updated successfully",
      success: true,
    });
  } catch (error) {
    const { message } = error as { message: string };
    console.log("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: message || "Internal Server Error",
    });
  }
};

// GET /api/user/me
export const getCurrentUser = async (req: Request, res: Response) => {
  const { _id } = req.authUser!;

  try {
    const user = await User.findById(_id).select(
      "-password -otp -password_reset",
    );
    return res.json(user);
  } catch (error) {
    console.log("Error while fetching current user: ", error);
    const { message } = error as { message: string };
    return res.status(500).json({ message: message || "Something Went wrong" });
  }
};
