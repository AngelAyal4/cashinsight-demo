import mongoose, { Document, Model, Schema } from 'mongoose';
import { IFinancialProfile } from '@/types';

export interface IFinancialProfileDocument
  extends Omit<IFinancialProfile, '_id' | 'hasPassword'>,
    Document {}

const financialProfileSchema = new Schema<IFinancialProfileDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    monthlyIncome: {
      type: Number,
      required: true,
      min: 0.01,
    },
    incomeAccuracy: {
      type: String,
      enum: ['approximate', 'exact'],
      required: true,
    },
    fixedExpenses: {
      type: Number,
      required: true,
      min: 0,
    },
    variableExpenses: {
      type: Number,
      required: true,
      min: 0,
    },
    emergencyFundMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 24,
      default: 3,
    },
    baseCurrency: {
      type: String,
      enum: ['ARS', 'USD', 'EUR'],
      required: true,
    },
    savingsCurrency: {
      type: String,
      enum: ['ARS', 'USD', 'EUR'],
      required: true,
    },
    avatar: {
      type: String,
      enum: ['bruno', 'mateo', 'clara', 'lucía', 'ren', 'max'],
      default: 'ren',
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    activeMonth: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

financialProfileSchema.index({ activeMonth: 1 });

export const FinancialProfile: Model<IFinancialProfileDocument> =
  mongoose.models.FinancialProfile ||
  mongoose.model<IFinancialProfileDocument>(
    'FinancialProfile',
    financialProfileSchema
  );
