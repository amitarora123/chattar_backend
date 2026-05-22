import { Request, Response } from "express";
import webpush from "web-push";
import { PushSubscription } from "@/models/PushSubscription";

let vapidInitialized = false;
function getWebPush() {
  if (!vapidInitialized) {
    webpush.setVapidDetails(
      process.env.VAPID_MAILTO!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    vapidInitialized = true;
  }
  return webpush;
}

export const getVapidPublicKey = (_req: Request, res: Response) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

export const subscribe = async (req: Request, res: Response) => {
  try {
    const { endpoint, keys } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
    const userId = req.authUser!._id;

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user_id: userId, endpoint, keys },
      { upsert: true, new: true },
    );

    res.json({ message: "Subscribed" });
  } catch (error) {
    const { message } = error as { message: string };
    res.status(500).json({ error: message });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body as { endpoint: string };
    await PushSubscription.deleteOne({ endpoint });
    res.json({ message: "Unsubscribed" });
  } catch (error) {
    const { message } = error as { message: string };
    res.status(500).json({ error: message });
  }
};

export const sendPushToUser = async (
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, unknown>;
  },
) => {
  const subscriptions = await PushSubscription.find({ user_id: userId }).lean();
  const dead: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await getWebPush().sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          dead.push(sub.endpoint);
        }
      }
    }),
  );

  if (dead.length > 0) {
    await PushSubscription.deleteMany({ endpoint: { $in: dead } });
  }
};
