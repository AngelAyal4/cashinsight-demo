import mongoose, { Schema, Document, Model } from 'mongoose';
import { ITransaction } from '@/types';

export interface ITransactionDocument extends Omit<ITransaction, '_id'>, Document {}

const transactionSchema = new Schema<ITransactionDocument>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: function (this: ITransactionDocument): boolean {
        return (
          this.type !== 'saving' &&
          this.type !== 'withdrawal' &&
          this.type !== 'settlement'
        );
      },
    },
    goal: {
      type: Schema.Types.ObjectId,
      ref: 'SavingsGoal',
      required: function (this: ITransactionDocument): boolean {
        return this.type === 'saving' || this.type === 'withdrawal';
      },
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'saving', 'withdrawal', 'settlement'],
      required: true,
    },
    /** Responsable del gasto compartido. Null = fuera del balance de pareja. */
    paidBy: {
      type: String,
      enum: ['yo', 'pareja', 'compartido', null],
      default: null,
    },
    /** Origen del ahorro: del ingreso del mes (income) o externo (external). */
    savingSource: {
      type: String,
      enum: ['income', 'external', null],
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
transactionSchema.index({ date: -1, archived: 1 });
transactionSchema.index({ type: 1, date: -1, archived: 1 });
transactionSchema.index({ category: 1, archived: 1 });
transactionSchema.index({ goal: 1, date: -1 });

export const Transaction: Model<ITransactionDocument> =
  mongoose.models.Transaction ||
  mongoose.model<ITransactionDocument>('Transaction', transactionSchema);
