'use server';

import { prisma } from '@/lib/prisma';

// Types for scheduled task creation
export type ScheduledTaskValues = {
  taskName: string;
  description?: string;
  ipRange?: string;
  scanRate: string;
  scheduleType: string;
};

export async function createScheduledTask(values: ScheduledTaskValues): Promise<{ data: any; error: string | null }> {
  try {
    // 计算下次执行时间
    let nextRunAt: Date | null = null;
    const now = new Date();

    switch (values.scheduleType) {
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
        name: values.taskName,
        description: values.description,
        ipRange: values.ipRange,
        scanRate: values.scanRate,
        scheduleType: values.scheduleType,
        nextRunAt,
        isActive: true
      }
    });

    return { data: task, error: null };
  } catch (error) {
    console.error('Error creating scheduled task:', error);
    return { data: null, error: 'Failed to create scheduled task.' };
  }
}

export async function updateNextRunTime(taskId: string, scheduleType: string): Promise<void> {
  try {
    const now = new Date();
    let nextRunAt: Date;

    switch (scheduleType) {
      case 'once':
        // 一次性任务不需要更新下次执行时间
        return;
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
        return;
    }

    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        nextRunAt,
        lastRunAt: now
      }
    });
  } catch (error) {
    console.error('Error updating next run time:', error);
  }
}

export async function getScanHistory(): Promise<any[]> {
  return prisma.taskExecution.findMany({
    include: {
      scheduledTask: true, // Include the related scheduled task to get its name
    },
    orderBy: {
      startTime: 'desc',
    },
  });
} 