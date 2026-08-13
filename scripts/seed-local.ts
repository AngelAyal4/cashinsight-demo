// Script local explícito para crear datos de ejemplo en desarrollo.
//
// Ejecutar desde la raíz del proyecto:
//   npm run seed:local
//   (equivalente: node --experimental-strip-types --import ./scripts/ts-path-loader.mjs scripts/seed-local.ts)
//
// Requiere MongoDB corriendo en localhost (o MONGODB_URI apuntando a una
// instancia local). NUNCA ejecutar contra Atlas/una instancia remota salvo una
// operación migratoria deliberada con SEED_ALLOW_REMOTE=1.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { seedDemoData } from '@/lib/seed';
import { hashPassword } from '@/lib/password';
import { getMonthKey } from '@/lib/monthly-date';
import { User } from '@/models/User';
import { FinancialProfile } from '@/models/FinancialProfile';
import { SavingsGoal } from '@/models/SavingsGoal';

const isRemoteUri = (uri: string): boolean => {
  try {
    const parsed = new URL(uri);
    const host = parsed.hostname.toLowerCase();

    return !(
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return true;
  }
};

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cashinsightapp';
  const dbName = new URL(uri).pathname.replace(/^\//, '') || 'cashinsightapp';

  console.log(`[seed:local] Base destino: ${dbName} (${isRemoteUri(uri) ? 'remota' : 'local'})`);

  if (isRemoteUri(uri) && process.env.SEED_ALLOW_REMOTE !== '1') {
    console.error(
      '[seed:local] ABORTADO: la URI apunta a una instancia remota. ' +
        'Si es una operación migratoria deliberada, confirmar con SEED_ALLOW_REMOTE=1.'
    );
    process.exit(1);
  }

  await connectDB();

  const seed = await seedDemoData();
  console.log(`[seed:local] ${seed.message} (categorías: ${seed.categories}, transacciones: ${seed.transactions})`);

  const email = 'prueba@cashinsight.app';
  const password = 'CashinsightDemo123!';
  const existing = await User.findOne({ email });

  if (!existing) {
    const user = await User.create({
      email,
      passwordHash: await hashPassword(password),
    });
    const now = new Date();
    const activeMonth = getMonthKey(now);

    await FinancialProfile.create({
      name: 'Cuenta de prueba',
      monthlyIncome: 200000,
      incomeAccuracy: 'exact',
      fixedExpenses: 100000,
      variableExpenses: 50000,
      emergencyFundMonths: 3,
      baseCurrency: 'ARS',
      savingsCurrency: 'ARS',
      onboardingCompleted: true,
      activeMonth,
    });

    await SavingsGoal.create({
      name: 'Fondo de emergencia',
      goalType: 'emergency',
      targetAmount: 300000,
      currency: 'ARS',
      isEmergency: true,
      priority: 'high',
      plannedMonthlyAmount: 50000,
      active: true,
    });

    console.log(`[seed:local] Usuario creado: ${email} (con perfil y meta de emergencia)`);
    void user;
  } else {
    console.log(`[seed:local] Usuario ya existía: ${email}`);
  }

  console.log('[seed:local] Listo.');
}

const runRequested = process.argv.includes('--run') || process.env.SEED_RUN === '1';
const isEntrypoint =
  process.argv[1]?.endsWith('seed-local.ts') || process.env.SEED_RUN === '1';

if (isEntrypoint || runRequested) {
  main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error('[seed:local] Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(() => {
      void mongoose.disconnect();
    });
}

export {};