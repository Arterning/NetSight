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
  ipRange: z.string().optional(),
  url: z.string().optional(),
  crawlDepth: z.string().default('full'),
  extractImages: z.boolean().default(true),
  valueKeywords: z.array(z.string()).default(['政府', '国家', '金融监管']),
  scanRate: z.string(),
  isScheduled: z.boolean(),
  scheduleType: z.string().optional(),
}).refine((data) => {
  if (data.url) {
    const urlValidation = z.string().url({ message: "请输入有效的URL。" }).safeParse(data.url);
    return urlValidation.success && (data.url.startsWith('http://') || data.url.startsWith('https://'));
  }
  return true;
}, {
  message: "URL必须是以 http:// 或 https:// 开头的有效链接。",
  path: ["url"],
}).refine((data) => data.ipRange || data.url, {
  message: "IP范围或URL至少需要填写一个。",
  path: ["ipRange"], // Also applies to url, but path needs one.
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

// Simulate finding active IPs for IP range scan
const getActiveIPsFromRange = (ipRange: string) => {
  // This is still a mock. In a real scenario, this would involve a network scan.
  console.log(`Simulating scan for IP range: ${ipRange}`);
  const ips = ['192.168.1.23', '192.168.1.58', '192.168.1.102', '192.168.1.174', '192.168.1.219'];
  const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 results
  return ips.sort(() => 0.5 - Math.random()).slice(0, count);
};

export async function scanAndAnalyzeAction(
  values: FormValues
): Promise<{ data: AssetCardData[] | null; error: string | null }> {
  const validation = formSchema.safeParse(values);
  if (!validation.success) {
    const error = validation.error.errors[0];
    return { data: null, error: `${error.path.join('.')}: ${error.message}` };
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

    let analysisTargets: {type: 'ip' | 'url', value: string}[] = [];

    if (values.url) {
      analysisTargets.push({ type: 'url', value: values.url });
    } else if (values.ipRange) {
      const activeIPs = getActiveIPsFromRange(values.ipRange);
      analysisTargets = activeIPs.map(ip => ({ type: 'ip', value: ip }));
    }

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

    const analysisPromises = analysisTargets.map(async (target) => {
      let content: string;
      let ip: string;
      let displayUrl: string;

      if (target.type === 'url') {
        displayUrl = target.value;
        ip = new URL(displayUrl).hostname; // Using hostname as a stand-in for IP
      } else { // ip
        ip = target.value;
        displayUrl = `http://${ip}`;
      }

      try {
        const response = await fetch(displayUrl);
        if (!response.ok) {
          console.error(`Failed to fetch ${displayUrl}: ${response.statusText}`);
          content = `Failed to fetch content from ${displayUrl}`;
        } else {
          const htmlContent = await response.text();
          content = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } catch (e: any) {
        console.error(`Error fetching ${displayUrl}:`, e);
        content = `Error fetching content from ${displayUrl}: ${e.message}`;
      }

      const [analysisResult, businessValueResult, associationResult] = await Promise.all([
        analyzeWebsiteContent({ url: displayUrl, content: content }),
        determineBusinessValue({ websiteUrl: displayUrl, websiteContent: content }),
        ipAssociationAnalysis({ ipAddress: ip }),
      ]);
      
      const assetData = {
        ip: ip,
        domain: associationResult.domain || (target.type === 'url' ? new URL(target.value).hostname : ''),
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
