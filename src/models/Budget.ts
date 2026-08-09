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
      min: 0.01,
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

budgetSchema.pre('validate', function () {
  if (this.endDate < this.startDate) {
    this.invalidate(
      'endDate',
      'La fecha de fin debe ser posterior o igual a la fecha de inicio'
    );
  }
});

// One budget per category per period per start date
budgetSchema.index({ category: 1, period: 1, startDate: 1 }, { unique: true });

export const Budget: Model<IBudgetDocument> =
  mongoose.models.Budget ||
  mongoose.model<IBudgetDocument>('Budget', budgetSchema);