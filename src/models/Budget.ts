import mongoose, { Schema, Document, Model } from 'mongoose';
import { IBudget } from '@/types';

export interface IBudgetDocument extends Omit<IBudget, '_id'>, Document {}

const budgetSchema = new Schema<IBudgetDocument>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One budget per category per period
budgetSchema.index({ category: 1, period: 1 }, { unique: true });

export const Budget: Model<IBudgetDocument> =
  mongoose.models.Budget ||
  mongoose.model<IBudgetDocument>('Budget', budgetSchema);
