'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Asset } from '@prisma/client';

const assetSchema = z.object({
  ip: z.string().min(1, 'IP address is required.'),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  owner: z.string().optional(),
  department: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).default('Active'),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export async function getAssets(search?: string, filter?: string): Promise<Asset[]> {
  const where: any = {
    isDeleted: false
  };

  if (search) {
    where.OR = [
      { ip: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { domain: { contains: search, mode: 'insensitive' } },
      { owner: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (filter) {
    where.status = filter;
  }

  return prisma.asset.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return prisma.asset.findFirst({
    where: {
      id,
      isDeleted: false
    }
  });
}

export async function createAssetAction(values: AssetFormValues): Promise<{ success: boolean; error?: string }> {
  const validation = assetSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, error: 'Invalid input data.' };
  }

  try {
    await prisma.asset.create({
      data: {
        ...values,
        domain: (values as any).domain || '',
        openPorts: '',
        valuePropositionScore: 0,
        summary: '',
        geolocation: '',
        services: '',
        networkTopology: '',
        taskName: 'Manual Entry',
      }
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating asset:', error);
    return { success: false, error: 'Failed to create asset.' };
  }
}

export async function updateAssetAction(id: string, values: AssetFormValues): Promise<{ success: boolean; error?: string }> {
  const validation = assetSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, error: 'Invalid input data.' };
  }

  try {
    await prisma.asset.update({
      where: { id },
      data: values
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating asset:', error);
    return { success: false, error: 'Failed to update asset.' };
  }
}

export async function deleteAssetAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.asset.update({
      where: { id },
      data: { isDeleted: true }
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { success: false, error: 'Failed to delete asset.' };
  }
}

export async function getAssetStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  byPriority: { [key: string]: number };
}> {
  const assets = await prisma.asset.findMany({
    where: { isDeleted: false }
  });

  const stats = {
    total: assets.length,
    active: assets.filter(a => a.status === 'Active').length,
    inactive: assets.filter(a => a.status === 'Inactive').length,
    maintenance: assets.filter(a => a.status === 'Maintenance').length,
    byPriority: {
      Low: assets.filter(a => a.priority === 'Low').length,
      Medium: assets.filter(a => a.priority === 'Medium').length,
      High: assets.filter(a => a.priority === 'High').length,
      Critical: assets.filter(a => a.priority === 'Critical').length,
    }
  };

  return stats;
}

export async function getAssetWithWebpages(assetId: string) {
  return prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      webpages: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
} 