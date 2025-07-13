import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching asset stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset stats' },
      { status: 500 }
    );
  }
} 