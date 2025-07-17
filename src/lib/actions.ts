'use server';

import { z } from 'zod';
import { analyzeWebsiteContent } from '@/ai/flows/analyze-website-content';
import { determineBusinessValue } from '@/ai/flows/determine-business-value';
import { ipAssociationAnalysis } from '@/ai/flows/ip-association-analysis';
import { crawlPage } from './crawl';
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
    let scheduledTaskId = null;
    if (values.isScheduled && values.scheduleType) {
      console.log('Creating scheduled task...');
    }

    const task = await createScheduledTask({
      taskName: values.taskName,
      description: values.description,
      domain: values.url ? new URL(values.url).hostname : '',
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

    const crawlWebsite = async (startUrl: string, assetId: string, maxDepth: number = 3) => {
      const visited = new Set<string>();
      const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
      const urls: string[] = [];
      const urlObj = new URL(startUrl);
      const baseDomain = urlObj.hostname;
      while (queue.length > 0) {
        const { url, depth } = queue.shift()!;
        if (visited.has(url) || depth > maxDepth) continue;
        visited.add(url);
        urls.push(url);
        let htmlContent = '';
        let title = '';
        try {

          const response = await crawlPage(url);
          htmlContent = response.text
          title = response.title;
          // 清理内容中的 null 字节
          const cleanHtmlContent = htmlContent.replace(/\x00/g, '');
          // 保存页面内容到数据库
          await prisma.webpage.upsert({
            where: { assetId_url: { assetId, url } },
            update: { content: cleanHtmlContent, title, isHomepage: depth === 0 },
            create: { assetId, url, content: cleanHtmlContent, title, isHomepage: depth === 0 },
          });
          
          const links = response.links || [];

          queue.push(
            ...links.map(link => {
              return { url: link, depth: depth + 1 };
            }
            ).filter(Boolean) as { url: string; depth: number }[]
          );

          // 解析所有同域下的链接
          // const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"'#>]+)["']/gi;
          // let match;
          // while ((match = linkRegex.exec(htmlContent)) !== null) {
          //   let link = match[1];
          //   if (link.startsWith('//')) link = urlObj.protocol + link;
          //   else if (link.startsWith('/')) link = urlObj.origin + link;
          //   else if (!/^https?:\/\//.test(link)) link = urlObj.origin + (urlObj.pathname.endsWith('/') ? '' : '/') + link;
          //   try {
          //     const linkObj = new URL(link, urlObj.origin);
          //     if (linkObj.hostname === baseDomain && !visited.has(linkObj.href)) {
          //       queue.push({ url: linkObj.href, depth: depth + 1 });
          //     }
          //   } catch {}
          // }
        } catch (e) {
          continue;
        }
      }
      // 生成 sitemap.xml
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') +
        '\n</urlset>';
      await prisma.asset.update({ where: { id: assetId }, data: { sitemapXml } });
      return { urls, sitemapXml };
    };

    const analysisPromises = analysisTargets.map(async (target) => {
      let content: string;
      let ip: string;
      let displayUrl: string;
      let htmlContent = '';
      let crawledUrls: string[] = [];
      let sitemapXml = '';

      if (target.type === 'url') {
        displayUrl = target.value;
        ip = new URL(displayUrl).hostname; // Using hostname as a stand-in for IP
      } else { // ip
        ip = target.value;
        displayUrl = `http://${ip}`;
      }

      // 递归爬取整个网站
      let assetId: string | null = null;
      let homepageContent = '';
      let homepageTitle = '';
      try {
        // 先保存首页内容
        const response = await fetch(displayUrl);
        if (response.ok) {
          homepageContent = await response.text();
          const titleMatch = homepageContent.match(/<title>(.*?)<\/title>/i);
          homepageTitle = titleMatch ? titleMatch[1] : 'No Title Found';
        }
      } catch {}

      // 先 upsert asset，获得 assetId
      const assetData = {
        ip: ip,
        domain: target.type === 'url' ? new URL(target.value).hostname : '',
        status: 'Active',
        openPorts: '80, 443', // Mock data
        valuePropositionScore: 0,
        summary: '',
        geolocation: '',
        services: '',
        networkTopology: '',
        taskName: taskName,
        taskExecutionId: taskExecutionId,
      };
      const upsertedAsset = await prisma.asset.upsert({
        where: { ip: ip },
        update: assetData,
        create: assetData,
      });
      assetId = upsertedAsset.id;

      // 保存首页内容到 Webpage
      if (homepageContent) {
        const cleanHomepageContent = homepageContent.replace(/\x00/g, '');
        await prisma.webpage.upsert({
          where: { assetId_url: { assetId, url: displayUrl } },
          update: { content: cleanHomepageContent, title: homepageTitle, isHomepage: true },
          create: { assetId, url: displayUrl, content: homepageContent, title: homepageTitle, isHomepage: true },
        });
      }

      // 爬取全站并生成 sitemap
      const crawlDepth = parseInt(values.crawlDepth || '3', 10);
      const crawlResult = await crawlWebsite(displayUrl, assetId, crawlDepth);
      crawledUrls = crawlResult.urls;
      sitemapXml = crawlResult.sitemapXml;

      // 分析首页内容
      content = homepageContent
        ? homepageContent.replace(/<style[^>]*>.*?<\/style>/g, ' ')
                         .replace(/<script[^>]*>.*?<\/script>/g, ' ')
                         .replace(/<[^>]*>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim()
        : '';

      const [analysisResult, businessValueResult, associationResult] = await Promise.all([
        analyzeWebsiteContent({ url: displayUrl, content: content }),
        determineBusinessValue({ url: displayUrl, description: content }),
        ipAssociationAnalysis({ ip: ip || displayUrl }),
      ]);

      console.log(`Analysis for ${displayUrl} completed:`, {
        analysisResult,
        businessValueResult,
        associationResult,
      });

      // 更新 asset 的分析信息
      await prisma.asset.update({
        where: { id: assetId },
        data: {
          valuePropositionScore: 8,
          summary: analysisResult,
          geolocation: "China",
          services: businessValueResult,
          networkTopology: associationResult,
        },
      });

      return {
        ip,
        analysis: analysisResult,
        businessValue: businessValueResult,
        association: associationResult,
        id: assetId,
        sitemapXml,
        crawledUrls,
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
