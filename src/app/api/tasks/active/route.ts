import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const executions = await prisma.taskExecution.findMany({
      where: { status: 'running' },
      include: {
        scheduledTask: true,
      },
      orderBy: { startTime: 'desc' },
      take: 10,
    });
    return NextResponse.json(executions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch active tasks' }, { status: 500 });
  }
} 