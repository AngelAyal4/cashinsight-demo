import mongoose, { Document, Model, Schema } from 'mongoose';
import { ISavingsGoal } from '@/types';

export interface ISavingsGoalDocument
  extends Omit<ISavingsGoal, '_id'>,
    Document {}

const savingsGoalSchema = new Schema<ISavingsGoalDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    goalType: {
      type: String,
      enum: ['emergency', 'home', 'car', 'retirement', 'travel', 'custom'],
      required: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      enum: ['ARS', 'USD', 'EUR'],
      required: true,
    },
    deadline: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    plannedMonthlyAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

savingsGoalSchema.index(
  { isEmergency: 1 },
  { unique: true, partialFilterExpression: { isEmergency: true } }
);
savingsGoalSchema.index({ active: 1, priority: 1 });

export const SavingsGoal: Model<ISavingsGoalDocument> =
  mongoose.models.SavingsGoal ||
  mongoose.model<ISavingsGoalDocument>('SavingsGoal', savingsGoalSchema);
