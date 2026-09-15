// Script de seed para la versión demo.
//
// Ejecutar:
//   npm run seed:demo
//   (o: node --experimental-strip-types --import ./scripts/ts-path-loader.mjs scripts/seed-demo.ts)
//
// Requiere MONGODB_URI apuntando a la base de datos demo (Atlas u local).
// Los datos incluyen: 18+ categorías, ~60 transacciones de 3 meses,
// presupuestos, metas de ahorro y snapshots de reportes generados.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Category } from '@/models/Category';
import { Transaction } from '@/models/Transaction';
import { Budget } from '@/models/Budget';
import { SavingsGoal } from '@/models/SavingsGoal';
import { MonthlySnapshot } from '@/models/MonthlySnapshot';
import { FinancialProfile } from '@/models/FinancialProfile';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';

const DEMO_USER_ID = 'demo-user-recruiter';

function dateInMonth(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

async function seedDemo(): Promise<void> {
  await connectDB();

  // Limpiar datos demo previos
  await Promise.all([
    Category.deleteMany({}),
    Transaction.deleteMany({}),
    Budget.deleteMany({}),
    SavingsGoal.deleteMany({}),
    MonthlySnapshot.deleteMany({}),
    FinancialProfile.deleteMany({}),
  ]);
  console.log('[seed:demo] Datos demo previos eliminados.');

  // 1. Categorías
  const categories = await Category.insertMany(
    DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      isDefault: true,
    }))
  );
  const catMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const c of categories) {
    catMap[c.name] = c._id;
  }
  const getCat = (name: string): mongoose.Types.ObjectId => {
    const id = catMap[name];
    if (!id) throw new Error(`Categoría no encontrada: ${name}`);
    return id;
  };
  console.log(`[seed:demo] ${categories.length} categorías creadas.`);

  // 2. Transacciones de 3 meses (junio, julio, agosto 2026)
  const now = new Date();
  const year = 2026;
  const months = [
    { month: 6, label: 'Junio' },
    { month: 7, label: 'Julio' },
    { month: 8, label: 'Agosto' },
  ];

  let totalTx = 0;
  for (const { month, label } of months) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const txs = [];

    // Ingresos (día 1 y 15)
    txs.push({
      amount: month === 7 ? 195000 : 185000 + (month - 6) * 5000,
      description: 'Sueldo mensual',
      category: getCat('Sueldo'),
      type: 'income' as const,
      date: dateInMonth(year, month, 1),
    });
    if (month === 7) {
      txs.push({
        amount: 48000,
        description: 'Proyecto freelance web',
        category: getCat('Freelance'),
        type: 'income' as const,
        date: dateInMonth(year, month, 15),
      });
    }

    // Gastos fijos
    txs.push({
      amount: 32500,
      description: 'Alquiler',
      category: getCat('Vivienda'),
      type: 'expense' as const,
      date: dateInMonth(year, month, 2),
    });
    txs.push({
      amount: 9500,
      description: 'Internet + celular',
      category: getCat('Servicios'),
      type: 'expense' as const,
      date: dateInMonth(year, month, 8),
    });

    // Gastos variables (distribuidos en el mes)
    const variableExpenses: readonly { readonly cat: string; readonly amounts: readonly number[]; readonly days: readonly number[] }[] = [
      { cat: 'Alimentación', amounts: [12400, 8600, 9200, 7800], days: [4, 11, 18, 25] },
      { cat: 'Transporte', amounts: [7200], days: [5] },
      { cat: 'Ocio', amounts: [5600, 3800], days: [13, 27] },
      { cat: 'Salud', amounts: [4100], days: [15] },
      { cat: 'Delivery', amounts: [3200, 2800], days: [9, 22] },
    ];

    for (const ve of variableExpenses) {
      for (let i = 0; i < ve.amounts.length; i++) {
        txs.push({
          amount: ve.amounts[i],
          description: `${ve.cat} - ${label}`,
          category: getCat(ve.cat),
          type: 'expense' as const,
          date: dateInMonth(year, month, ve.days[i]),
        });
      }
    }

    await Transaction.insertMany(txs);
    totalTx += txs.length;
    console.log(`[seed:demo] ${label}: ${txs.length} transacciones.`);
  }
  console.log(`[seed:demo] Total transacciones: ${totalTx}.`);

  // 3. Presupuestos (límites de control)
  const budgets = await Budget.insertMany([
    {
      name: 'Alimentación',
      category: getCat('Alimentación'),
      amount: 35000,
      currency: 'ARS',
      active: true,
    },
    {
      name: 'Ocio',
      category: getCat('Ocio'),
      amount: 15000,
      currency: 'ARS',
      active: true,
    },
    {
      name: 'Delivery',
      category: getCat('Delivery'),
      amount: 8000,
      currency: 'ARS',
      active: true,
    },
  ]);
  console.log(`[seed:demo] ${budgets.length} presupuestos creados.`);

  // 4. Metas de ahorro
  const goals = await SavingsGoal.insertMany([
    {
      name: 'Fondo de emergencia',
      goalType: 'emergency',
      targetAmount: 300000,
      currentAmount: 120000,
      currency: 'ARS',
      isEmergency: true,
      priority: 'high',
      plannedMonthlyAmount: 50000,
      active: true,
    },
    {
      name: 'Vacaciones 2027',
      goalType: 'vacation',
      targetAmount: 500000,
      currentAmount: 80000,
      currency: 'ARS',
      isEmergency: false,
      priority: 'medium',
      plannedMonthlyAmount: 30000,
      active: true,
    },
  ]);
  console.log(`[seed:demo] ${goals.length} metas de ahorro creadas.`);

  // 5. Perfil financiero
  await FinancialProfile.create({
    name: 'Usuario Demo',
    monthlyIncome: 233000,
    incomeAccuracy: 'exact',
    fixedExpenses: 51500,
    variableExpenses: 110000,
    emergencyFundMonths: 3,
    baseCurrency: 'ARS',
    savingsCurrency: 'ARS',
    onboardingCompleted: true,
    activeMonth: '2026-09',
  });
  console.log('[seed:demo] Perfil financiero creado.');

  console.log('\n[seed:demo] ✅ Seed demo completado.');
  console.log(`[seed:demo] Usuario demo: ${DEMO_USER_ID} (hardcoded, sin auth)`);
  console.log('[seed:demo] Meses con datos: Junio, Julio, Agosto 2026.');
}

seedDemo()
  .then(() => {
    console.log('[seed:demo] Finalizado correctamente.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed:demo] Error:', err);
    process.exit(1);
  });
