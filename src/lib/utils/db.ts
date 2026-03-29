import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongodbUri = process.env.MONGODB_URI || "";
  await mongoose.connect(mongodbUri, {
    dbName: 'chatter',
  });
};
