'use server';

import { z } from 'zod';
import { analyzeWebsiteContent } from '@/ai/flows/analyze-website-content';
import { determineBusinessValue } from '@/ai/flows/determine-business-value';
import { ipAssociationAnalysis } from '@/ai/flows/ip-association-analysis';
import type { Asset as AssetCardData } from '@/components/asset-card';
import { prisma } from '@/lib/prisma';
import type { Asset } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const formSchema = z.object({
  taskName: z.string().min(1, '任务名称是必需的。'),
  description: z.string().optional(),
  ipRange: z.string().min(1, 'IP范围是必需的。'),
  scanRate: z.string(),
  isScheduled: z.boolean(),
  scheduleType: z.string().optional(),
});

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

type FormValues = z.infer<typeof formSchema>;
type AssetFormValues = z.infer<typeof assetSchema>;

const mockContents: { [key: string]: string } = {
  '192.168.1.23': `<html><title>Innovatech Solutions</title><body><h1>Innovatech Solutions</h1><p>We provide cutting-edge AI-driven solutions for enterprise customers.</p></body></html>`,
  '192.168.1.58': `<html><title>CloudSphere Hosting</title><body><h1>CloudSphere Hosting</h1><p>Reliable and scalable cloud hosting for your business-critical applications.</p></body></html>`,
  '192.168.1.102': `<html><title>Gamer's Hub</title><body><h1>Gamer's Hub</h1><p>Your one-stop shop for gaming news, reviews, and community forums.</p></body></html>`,
  '192.168.1.174': `<html><title>OpenSource Project - NetWeaver</title><body><h1>NetWeaver</h1><p>A free, open-source library for network packet analysis.</p></body></html>`,
  '192.168.1.219': `<html><title>SecureVault VPN</title><body><h1>SecureVault VPN</h1><p>Protect your online privacy with our military-grade encrypted VPN service.</p></body></html>`,
};

// Simulate finding active IPs
const getActiveIPs = () => {
  const ips = ['192.168.1.23', '192.168.1.58', '192.168.1.102', '192.168.1.174', '192.168.1.219'];
  const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 results
  return ips.sort(() => 0.5 - Math.random()).slice(0, count);
};

export async function scanAndAnalyzeAction(
  values: FormValues
): Promise<{ data: AssetCardData[] | null; error: string | null }> {
  const validation = formSchema.safeParse(values);
  if (!validation.success) {
    return { data: null, error: 'Invalid input.' };
  }

  try {
    // 如果是定时任务，先创建任务
    let scheduledTaskId: string | null = null;
    if (values.isScheduled && values.scheduleType) {
      const task = await createScheduledTask(values);
      if (task.error) {
        return { data: null, error: task.error };
      }
      scheduledTaskId = task.data?.id || null;
    }

    // Simulate network latency for scanning
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const activeIPs = getActiveIPs();
    const taskName = values.taskName || `Scan_${new Date().toISOString()}`;

    // 创建任务执行记录
    let taskExecutionId: string | null = null;
    if (scheduledTaskId) {
      const execution = await prisma.taskExecution.create({
        data: {
          scheduledTaskId,
          status: 'running',
          startTime: new Date(),
          assetsFound: 0,
        }
      });
      taskExecutionId = execution.id;
    }

    const analysisPromises = activeIPs.map(async (ip) => {
      const mockContent = mockContents[ip] || `<html><body><h1>No content found for ${ip}</h1></body></html>`;
      const mockUrl = `http://${ip}`;

      const [analysisResult, businessValueResult, associationResult] = await Promise.all([
        analyzeWebsiteContent({ url: mockUrl, content: mockContent }),
        determineBusinessValue({ websiteUrl: mockUrl, websiteContent: mockContent }),
        ipAssociationAnalysis({ ipAddress: ip }),
      ]);
      
      const assetData = {
        ip: ip,
        domain: associationResult.domain,
        status: 'Active',
        openPorts: '80, 443', // Mock data
        valuePropositionScore: businessValueResult.valuePropositionScore,
        summary: analysisResult.summary,
        geolocation: associationResult.geolocation,
        services: associationResult.services,
        networkTopology: associationResult.networkTopology,
        taskName: taskName,
        taskExecutionId: taskExecutionId,
      };

      await prisma.asset.upsert({
        where: { ip: ip },
        update: assetData,
        create: assetData,
      });

      return {
        ip,
        analysis: analysisResult,
        businessValue: businessValueResult,
        association: associationResult,
      };
    });

    const results = await Promise.all(analysisPromises);

    // 更新任务执行记录
    if (taskExecutionId) {
      const endTime = new Date();
      const startTime = await prisma.taskExecution.findUnique({
        where: { id: taskExecutionId },
        select: { startTime: true }
      });

      const duration = startTime?.startTime 
        ? Math.floor((endTime.getTime() - startTime.startTime.getTime()) / 1000)
        : null;

      await prisma.taskExecution.update({
        where: { id: taskExecutionId },
        data: {
          status: 'completed',
          endTime,
          duration,
          assetsFound: results.length,
        }
      });

      // 更新定时任务的下次执行时间
      if (scheduledTaskId) {
        await updateNextRunTime(scheduledTaskId, values.scheduleType!);
      }
    }

    revalidatePath('/');
    revalidatePath('/tasks');
    return { data: results, error: null };
  } catch (error) {
    console.error('Error during scan and analysis:', error);
    return { data: null, error: 'Failed to complete analysis. Please try again.' };
  }
}

async function createScheduledTask(values: FormValues): Promise<{ data: any; error: string | null }> {
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
        scheduleType: values.scheduleType!,
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

async function updateNextRunTime(taskId: string, scheduleType: string): Promise<void> {
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
                domain: values.domain || '',
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
