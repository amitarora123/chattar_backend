import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IContacts extends Document {
  owner_id: Types.ObjectId; // The user who owns the contact list
  user_id: Types.ObjectId; // The saved user
  name?: string; // Optional custom nickname
}

const contactSchema = new Schema<IContacts>(
  {
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate contacts (same owner cannot save same user twice)
contactSchema.index({ owner_id: 1, user_id: 1 }, { unique: true });

// Optimize fetching all contacts of a user
contactSchema.index({ owner_id: 1 });

export const Contacts =
  mongoose.models.Contacts ||
  mongoose.model<IContacts>('Contacts', contactSchema);
