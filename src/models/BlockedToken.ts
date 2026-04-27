import mongoose, { Document, Schema } from "mongoose";

interface IBlockedToken extends Document {
  token: string;
  expiresAt: Date;
}

const blockedTokenSchema = new Schema<IBlockedToken>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

blockedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BlockedToken =
  mongoose.models.BlockedToken ||
  mongoose.model("BlockedToken", blockedTokenSchema);

export default BlockedToken;
