import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IRateLimitDocument extends Document {
  key: string;
  count: number;
  resetAt: Date;
}

const rateLimitSchema = new Schema<IRateLimitDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  { versionKey: false }
);

rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<IRateLimitDocument> =
  mongoose.models.RateLimit ||
  mongoose.model<IRateLimitDocument>('RateLimit', rateLimitSchema);
