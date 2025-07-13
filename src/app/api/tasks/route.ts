import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tasks = await prisma.scheduledTask.findMany({
      include: {
        executions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(tasks);
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