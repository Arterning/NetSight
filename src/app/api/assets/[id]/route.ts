import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assetUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  ip: z.string().optional(),
  domain: z.string().optional(),
  openPorts: z.string().optional(),
  summary: z.string().optional(),
  geolocation: z.string().optional(),
  services: z.string().optional(),
  networkTopology: z.string().optional(),
  tags: z.string().optional(),
  department: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const validation = assetUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: id },
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
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    // Before deleting the asset, we need to delete related records
    // due to foreign key constraints.
    await prisma.webpage.deleteMany({
      where: { assetId: id },
    });

    await prisma.asset.delete({
      where: { id: id },
    });

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
