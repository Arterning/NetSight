import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // 只查找定时任务（排除 scheduleType === 'once'）
    const [tasks, total] = await Promise.all([
      prisma.scheduledTask.findMany({
        where: { scheduleType: { not: 'once' } },
        include: {
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.scheduledTask.count({ where: { scheduleType: { not: 'once' } } })
    ]);

    return NextResponse.json({ tasks, total });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskName, description, ipRange, scanRate, scheduleType } = body;

    // 计算下次执行时间
    let nextRunAt: Date | null = null;
    const now = new Date();

    switch (scheduleType) {
      case 'once':
        nextRunAt = now;
        break;
      case 'daily':
        nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'every3days':
        nextRunAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextRunAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        nextRunAt = now;
    }

    const task = await prisma.scheduledTask.create({
      data: {
        name: taskName,
        description,
        ipRange,
        scanRate,
        scheduleType,
        nextRunAt,
        isActive: true
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 