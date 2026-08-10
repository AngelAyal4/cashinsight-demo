import { NextResponse } from 'next/server';
import { getSessionUserId, unauthorizedResponse } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Category } from '@/models/Category';
import { Transaction } from '@/models/Transaction';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';

export async function POST() {
  if (!(await getSessionUserId())) {
    return unauthorizedResponse();
  }

  try {
    await connectDB({ runMonthlyRollover: true });

    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      const categories = await Category.find().select('name type').lean();
      const existingKeys = new Set(categories.map((category) => `${category.name}:${category.type}`));
      const missingCategories = DEFAULT_CATEGORIES.filter(
        (category) => !existingKeys.has(`${category.name}:${category.type}`)
      );

      if (missingCategories.length > 0) {
        await Category.insertMany(missingCategories);
      }

      return NextResponse.json({ message: 'Ya existe data' });
    }

    const categories = await Category.insertMany(DEFAULT_CATEGORIES);
    const categoryByName = new Map(
      categories.map((category) => [category.name, category._id])
    );
    const getCategoryId = (name: string) => {
      const categoryId = categoryByName.get(name);

      if (!categoryId) {
        throw new Error(`Categoría no encontrada: ${name}`);
      }

      return categoryId;
    };

    const now = new Date();
    const dateInCurrentMonth = (daysAgo: number) =>
      new Date(
        now.getFullYear(),
        now.getMonth(),
        Math.max(1, now.getDate() - daysAgo),
        12
      );

    await Transaction.insertMany([
      {
        amount: 185000,
        description: 'Sueldo mensual',
        category: getCategoryId('Sueldo'),
        type: 'income',
        date: dateInCurrentMonth(1),
      },
      {
        amount: 48000,
        description: 'Proyecto freelance',
        category: getCategoryId('Freelance'),
        type: 'income',
        date: dateInCurrentMonth(6),
      },
      {
        amount: 32500,
        description: 'Alquiler',
        category: getCategoryId('Vivienda'),
        type: 'expense',
        date: dateInCurrentMonth(2),
      },
      {
        amount: 12400,
        description: 'Compra semanal',
        category: getCategoryId('Alimentación'),
        type: 'expense',
        date: dateInCurrentMonth(4),
      },
      {
        amount: 8600,
        description: 'Supermercado',
        category: getCategoryId('Alimentación'),
        type: 'expense',
        date: dateInCurrentMonth(11),
      },
      {
        amount: 7200,
        description: 'Abono transporte',
        category: getCategoryId('Transporte'),
        type: 'expense',
        date: dateInCurrentMonth(5),
      },
      {
        amount: 9500,
        description: 'Internet y servicios',
        category: getCategoryId('Servicios'),
        type: 'expense',
        date: dateInCurrentMonth(8),
      },
      {
        amount: 5600,
        description: 'Cena con amigos',
        category: getCategoryId('Ocio'),
        type: 'expense',
        date: dateInCurrentMonth(13),
      },
      {
        amount: 4100,
        description: 'Farmacia',
        category: getCategoryId('Salud'),
        type: 'expense',
        date: dateInCurrentMonth(15),
      },
      {
        amount: 3800,
        description: 'Cine',
        category: getCategoryId('Ocio'),
        type: 'expense',
        date: dateInCurrentMonth(18),
      },
    ]);

    return NextResponse.json(
      { message: 'Datos de ejemplo creados', categories: categories.length, transactions: 10 },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creando datos de ejemplo:', error);
    return NextResponse.json(
      { error: 'Error al crear datos de ejemplo' },
      { status: 500 }
    );
  }
}
