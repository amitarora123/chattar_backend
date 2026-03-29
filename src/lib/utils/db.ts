import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongodbUri = process.env.MONGODB_URI || "";
  const res = await mongoose.connect(mongodbUri, {
    dbName: 'chatter',
  });
  console.log('connected to mongodb database:', res.connection.name)
};
