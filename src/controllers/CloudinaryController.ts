import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_APIKEY,
  api_secret: process.env.CLOUDINARY_APISECRET,
});

// POST /api/cloudinary/sign
export const signUpload = async (_req: Request, res: Response) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: "chat-attachments" },
      process.env.CLOUDINARY_APISECRET!,
    );

    return res.status(200).json({
      timestamp,
      signature,
      api_key: process.env.CLOUDINARY_APIKEY,
      cloud_name: process.env.CLOUDINARY_CLOUDNAME,
      upload_preset: "chat-attachments",
    });
  } catch (error) {
    console.log("Error Signing upload url:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Error generating signature" });
  }
};
