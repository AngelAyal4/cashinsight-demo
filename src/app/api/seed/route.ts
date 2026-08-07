import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Category } from '@/models/Category';
import { Transaction } from '@/models/Transaction';

const defaultCategories = [
  { name: 'Alimentación', type: 'expense', color: '#f97316', icon: 'utensils', isDefault: true },
  { name: 'Transporte', type: 'expense', color: '#0ea5e9', icon: 'car', isDefault: true },
  { name: 'Vivienda', type: 'expense', color: '#8b5cf6', icon: 'home', isDefault: true },
  { name: 'Ocio', type: 'expense', color: '#ec4899', icon: 'film', isDefault: true },
  { name: 'Salud', type: 'expense', color: '#14b8a6', icon: 'heart', isDefault: true },
  { name: 'Servicios', type: 'expense', color: '#64748b', icon: 'bolt', isDefault: true },
  { name: 'Otro', type: 'expense', color: '#94a3b8', icon: 'dots', isDefault: true },
  { name: 'Sueldo', type: 'income', color: '#22c55e', icon: 'briefcase', isDefault: true },
  { name: 'Freelance', type: 'income', color: '#84cc16', icon: 'laptop', isDefault: true },
  { name: 'Otro', type: 'income', color: '#94a3b8', icon: 'dots', isDefault: true },
] as const;

export async function POST() {
  try {
    await connectDB();

    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      return NextResponse.json({ message: 'Ya existe data' });
    }

    const categories = await Category.insertMany(defaultCategories);
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
