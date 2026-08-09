import mongoose, { Document, Model, Schema } from 'mongoose';
import { IMonthlySnapshot } from '@/types';

export interface IMonthlySnapshotDocument
  extends Omit<IMonthlySnapshot, '_id'>,
    Document {}

const snapshotSchema = new Schema<IMonthlySnapshotDocument>(
  {
    monthKey: {
      type: String,
      required: true,
      trim: true,
    },
    currency: {
      type: String,
      enum: ['ARS', 'USD', 'EUR'],
      required: true,
    },
    range: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    income: {
      type: Number,
      required: true,
      min: 0,
    },
    expenses: {
      type: Number,
      required: true,
      min: 0,
    },
    savings: {
      type: Number,
      required: true,
      default: 0,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    totalFixed: {
      type: Number,
      required: true,
      min: 0,
    },
    totalVariable: {
      type: Number,
      required: true,
      min: 0,
    },
    expensesByCategory: {
      type: [
        {
          category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
          },
          name: { type: String, required: true },
          color: { type: String, required: true },
          icon: { type: String },
          behavior: {
            type: String,
            enum: ['fijo', 'variable'],
            required: true,
          },
          total: { type: Number, required: true },
          percentage: { type: Number, required: true },
        },
      ],
      default: [],
    },
    budgetCompliance: {
      type: [
        {
          budget: {
            type: Schema.Types.ObjectId,
            ref: 'Budget',
            required: true,
          },
          category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
          },
          categoryName: { type: String, required: true },
          color: { type: String, required: true },
          amount: { type: Number, required: true },
          usedAmount: { type: Number, required: true },
          usagePercent: { type: Number, required: true },
          status: {
            type: String,
            enum: ['sano', 'advertencia', 'excedido'],
            required: true,
          },
        },
      ],
      default: [],
    },
    goals: {
      type: [
        {
          goal: {
            type: Schema.Types.ObjectId,
            ref: 'SavingsGoal',
            required: true,
          },
          name: { type: String, required: true },
          currency: {
            type: String,
            enum: ['ARS', 'USD', 'EUR'],
            required: true,
          },
          amount: { type: Number, required: true, default: 0 },
          targetAmount: { type: Number, required: true },
          currentAmount: { type: Number, required: true },
          progressPercentage: { type: Number, required: true },
        },
      ],
      default: [],
    },
    financialScore: {
      type: Number,
      default: null,
    },
    scoreMessage: {
      type: String,
      default: null,
    },
    transactionsCount: {
      type: Number,
      required: true,
      min: 0,
    },
    metrics: {
      topSpendingDay: {
        date: { type: String },
        amount: { type: Number },
      },
      averageDailyExpense: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Impide snapshots duplicados por mes: dos requests simultáneos no duplican.
snapshotSchema.index({ monthKey: 1 }, { unique: true });

export const MonthlySnapshot: Model<IMonthlySnapshotDocument> =
  mongoose.models.MonthlySnapshot ||
  mongoose.model<IMonthlySnapshotDocument>('MonthlySnapshot', snapshotSchema);