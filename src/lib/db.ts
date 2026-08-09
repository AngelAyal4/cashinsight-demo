// MongoDB connection utility
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cashinsightapp';

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

const cached: CachedConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

let budgetIndexesSynced = false;
let categoryBehaviorMigrated = false;

async function syncBudgetIndexes(): Promise<void> {
  if (budgetIndexesSynced) {
    return;
  }

  const { Budget } = await import('@/models/Budget');
  // La colección no tiene datos: sincroniza los índices del schema una única vez,
  // eliminando el índice viejo { category, period } y dejando { category, period, startDate }.
  await Budget.syncIndexes();
  budgetIndexesSynced = true;
}

/**
 * Migración única: categorías de gasto creadas antes del campo `behavior`
 * pasan a `variable` (comportamiento por defecto de los gastos personalizados).
 */
async function migrateCategoryBehavior(): Promise<void> {
  if (categoryBehaviorMigrated) {
    return;
  }

  const { Category } = await import('@/models/Category');
  await Category.updateMany(
    { type: 'expense', behavior: { $exists: false } },
    { $set: { behavior: 'variable' } }
  );
  categoryBehaviorMigrated = true;
}

export interface ConnectDBOptions {
  /** Ejecuta el rollover mensual post-conexión (solo rutas que ya validaron sesión). */
  runMonthlyRollover?: boolean;
}

export async function connectDB(options: ConnectDBOptions = {}): Promise<typeof mongoose> {
  if (!cached.conn) {
    if (!cached.promise) {
      cached.promise = mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
      });
    }

    try {
      cached.conn = await cached.promise;
      await syncBudgetIndexes();
      await migrateCategoryBehavior();
      console.log('✅ MongoDB conectado');
    } catch (error) {
      cached.promise = null;
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  if (options.runMonthlyRollover) {
    const { runMonthlyRollover } = await import('@/lib/monthly-cycle');
    await runMonthlyRollover();
  }

  return cached.conn;
}

export default connectDB;