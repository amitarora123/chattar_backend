import mongoose from "mongoose";

const dropStaleIndexes = async () => {
  try {
    const collection = mongoose.connection.collection("messageviews");
    // Drop the old index that used `participant_id` (now renamed to `user_id`).
    // If the index doesn't exist the driver throws — that's fine, we just ignore it.
    await collection.dropIndex("message_id_1_participant_id_1");
    console.log(
      "Dropped stale messageviews index: message_id_1_participant_id_1",
    );
  } catch {
    // Index already absent — nothing to do
  }
};

export const connectDB = async () => {
  const mongodbUri = process.env.MONGODB_URI || "";
  const res = await mongoose.connect(mongodbUri, {
    dbName: "chatter",
  });
  console.log("connected to mongodb database:", res.connection.name);
  await dropStaleIndexes();
};
