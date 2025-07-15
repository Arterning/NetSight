'use server';

import { z } from 'zod';
import { analyzeWebsiteContent } from '@/ai/flows/analyze-website-content';
import { determineBusinessValue } from '@/ai/flows/determine-business-value';
import { ipAssociationAnalysis } from '@/ai/flows/ip-association-analysis';
import type { Asset as AssetCardData } from '@/components/asset-card';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createScheduledTask, updateNextRunTime } from '@/lib/task-actions';

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
  path: ["ipRange"],
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

// Define the result type for scanAndAnalyzeAction
export type ScanAndAnalyzeResult = {
  ip: string;
  analysis: { summary: string };
  businessValue: { valuePropositionScore: number; businessValueSummary: string };
  association: { domain: string; geolocation: string; services: string; networkTopology: string };
  id: string;
};

export async function scanAndAnalyzeAction(
  values: FormValues
): Promise<{ data: ScanAndAnalyzeResult[] | null; error: string | null }> {
  const validation = formSchema.safeParse(values);
  if (!validation.success) {
    const error = validation.error.errors[0];
    return { data: null, error: `${error.path.join('.')}: ${error.message}` };
  }

  try {
    // 无论是定时任务还是一次性任务，都需要先创建任务
    let scheduledTaskId: string | null = null;
    if (values.isScheduled && values.scheduleType) {
      console.log('Creating scheduled task...');
    }

    const task = await createScheduledTask({
      taskName: values.taskName,
      description: values.description,
      ipRange: values.ipRange,
      scanRate: values.scanRate,
      scheduleType: values.scheduleType || 'once',
    });
    if (task.error) {
      return { data: null, error: task.error };
    }
    scheduledTaskId = task.data?.id || null;

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
    const execution = await prisma.taskExecution.create({
      data: {
        scheduledTaskId,
        status: 'running',
        startTime: new Date(),
        assetsFound: 0,
      }
    });
    taskExecutionId = execution.id;

    const analysisPromises = analysisTargets.map(async (target) => {
      let content: string;
      let ip: string;
      let displayUrl: string;
      let htmlContent = '';

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
          htmlContent = await response.text();
          // For analysis, use stripped text. For DB, store raw-ish content.
          content = htmlContent.replace(/<style[^>]*>.*?<\/style>/gs, ' ')
                               .replace(/<script[^>]*>.*?<\/script>/gs, ' ')
                               .replace(/<[^>]*>/g, ' ')
                               .replace(/\s+/g, ' ')
                               .trim();
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

      const upsertedAsset = await prisma.asset.upsert({
        where: { ip: ip },
        update: assetData,
        create: assetData,
      });

      // If we have HTML content, save it to the Webpage table
      if (htmlContent) {
        const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'No Title Found';

        await prisma.webpage.create({
          data: {
            assetId: upsertedAsset.id,
            url: displayUrl,
            title: title,
            content: htmlContent, // Store the full HTML
            isHomepage: true, // This is the first page crawled
          }
        });
      }

      return {
        ip,
        analysis: analysisResult,
        businessValue: businessValueResult,
        association: associationResult,
        id: upsertedAsset.id, // Pass the ID back
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
