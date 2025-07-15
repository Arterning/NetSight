import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assetUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validation = assetUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: validation.data,
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error('Failed to update asset:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Before deleting the asset, we need to delete related records
    // due to foreign key constraints.
    await prisma.webpage.deleteMany({
      where: { assetId: params.id },
    });

    await prisma.asset.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
