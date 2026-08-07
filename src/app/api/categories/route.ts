import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Category } from '@/models/Category';

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 });
    const sortedCategories = categories
      .slice()
      .sort((a, b) => {
        const aIsOther = a.name === 'Otro' ? 1 : 0;
        const bIsOther = b.name === 'Otro' ? 1 : 0;

        if (aIsOther !== bIsOther) {
          return aIsOther - bIsOther;
        }

        return a.name.localeCompare(b.name, 'es');
      });
    return NextResponse.json(sortedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const category = await Category.create(body);
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    const message =
      error instanceof Error ? error.message : 'Error al crear categoría';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
