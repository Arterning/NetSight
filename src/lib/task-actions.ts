'use server';

import { prisma } from '@/lib/prisma';
import { scanAndAnalyzeAction } from '@/lib/actions';

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

export async function rerunScheduledTaskAction(taskId: string) {
  // 查找定时任务的最新参数
  const scheduledTask = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
  if (!scheduledTask) {
    return { error: 'Task not found', data: null };
  }
  // 组装 scanAndAnalyzeAction 参数
  const values = {
    taskName: scheduledTask.name,
    description: scheduledTask.description || '',
    ipRange: scheduledTask.ipRange || undefined,
    url: scheduledTask.ipRange,
    crawlDepth: '3',
    extractImages: true,
    valueKeywords: ['政府', '国家', '金融监管'],
    scanRate: scheduledTask.scanRate,
    isScheduled: false,
    scheduleType: scheduledTask.scheduleType,
  };
  if ((!scheduledTask.ipRange || scheduledTask.ipRange === '') && scheduledTask.name && scheduledTask.name.startsWith('http')) {
    (values as any).url = scheduledTask.name;
    values.ipRange = undefined;
  }
  // 运行扫描分析
  const result = await scanAndAnalyzeAction(values);
  return result;
} 