'use server';

import { z } from 'zod';
import { analyzeWebsiteContent } from '@/ai/flows/analyze-website-content';
import { determineBusinessValue } from '@/ai/flows/determine-business-value';
import { ipAssociationAnalysis } from '@/ai/flows/ip-association-analysis';
import dns from 'dns/promises';
import net from 'net';
import { crawlPage, crawlMetaData } from './crawl';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getDomainFromUrl } from '@/lib/utils'; 
import { createScheduledTask, updateNextRunTime } from '@/lib/task-actions';

const formSchema = z.object({
  taskName: z.string().optional(),
  description: z.string().optional(),
  ipRange: z.string().optional(),
  url: z.string().min(1, 'URL是必需的。').url('请输入有效的URL。'),
  crawlDepth: z.string().default('full'),
  extractImages: z.boolean().default(true),
  valueKeywords: z.array(z.string()).default(['政府', '国家', '金融监管']),
  scanRate: z.string(),
  isScheduled: z.boolean(),
  scheduleType: z.string().optional(),
  customCrawlDepth: z.number().optional(),
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

async function getIpFromDomain(domain: string): Promise<string | null> {
  try {
    const { address } = await dns.lookup(domain);
    return address;
  } catch (error) {
    console.error(`Could not resolve IP for domain: ${domain}`, error);
    return null;
  }
}

async function getGeolocationFromUrl(url: string): Promise<string> {
  try {
    const hostname = new URL(url).hostname;
    const ip = await getIpFromDomain(hostname);
    if (!ip) return '未知';
    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
    const data = await res.json();
    if (data.status === 'success') {
      return `${data.country || ''}${data.regionName ? ', ' + data.regionName : ''}${data.city ? ', ' + data.city : ''}`;
    }
    return '未知';
  } catch (e) {
    return '未知';
  }
}


async function scanOpenPorts(host: string, ports: number[], timeout = 1000): Promise<number[]> {
  const openPorts: number[] = [];
  const ip = await getIpFromDomain(host);
  if (!ip) return [];

  await Promise.all(
    ports.map(port =>
      new Promise<void>((resolve) => {
        const socket = new net.Socket();
        let isOpen = false;
        socket.setTimeout(timeout);

        socket.once('connect', () => {
          isOpen = true;
          openPorts.push(port);
          socket.destroy();
        });
        socket.once('timeout', () => socket.destroy());
        socket.once('error', () => socket.destroy());
        socket.once('close', () => resolve());

        socket.connect(port, ip);
      })
    )
  );
  return openPorts;
}

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


/**
 * 处理新域名：如遇到新域名则新建 Asset，并创建 AssetAssociation 关联。
 * @param sourceAssetId 当前页面所属资产ID
 * @param sourceUrl 当前页面URL
 * @param targetUrl 新发现的链接URL
 */
export async function handleNewDomainAndAssociation(taskExecutionId: string, sourceAssetId: string, sourceUrl: string, targetUrl: string) {
  
  console.log(`Handling url association: ${sourceUrl} -> ${targetUrl}`);

  const sourceDomain = getDomainFromUrl(sourceUrl);
  const targetDomain = getDomainFromUrl(targetUrl);

  console.log(`Handling new domain association: ${sourceDomain} -> ${targetDomain}`);

  if (sourceDomain === targetDomain) {
    // 如果源和目标域名相同，则不需要处理
    console.log(`Source and target domains are the same: ${sourceDomain}`);
    return;
  }

  // 查找或新建 Asset
  let targetAsset = await prisma.asset.findFirst({ where: { domain: targetDomain } });
  if (!targetAsset) {
    const resolvedIp = await getIpFromDomain(targetDomain);
    if (!resolvedIp) {
      console.error(`Could not resolve IP for new domain ${targetDomain}. Cannot create asset.`);
      return;
    }
    
    // Check for an existing asset with the same IP to avoid unique constraint errors
    const existingAssetWithIp = await prisma.asset.findUnique({ where: { ip: resolvedIp } });

    if (existingAssetWithIp) {
      targetAsset = existingAssetWithIp;
    } else {
      targetAsset = await prisma.asset.create({ 
        data: { 
          taskExecutionId, 
          taskName: '', 
          domain: targetDomain, 
          ip: resolvedIp, 
          status: 'Active' 
        } 
      });
    }
  }

  if (!targetAsset) {
    console.log(`Failed to find or create asset for domain: ${targetDomain}.`);
    return;
  }

  console.log(`Create assetAssociation Source domain: ${sourceDomain}, Target domain: ${targetDomain}`);

  // 创建关联
  await prisma.assetAssociation.create({
    data: {
      sourceAssetId,
      targetAssetId: targetAsset.id,
      sourceUrl,
      targetUrl,
    }
  });
  return targetAsset;
}


const crawlWebsite = async (startUrl: string, assetId: string, maxDepth: number = 3, taskExecutionId: string) => {
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
  const urls: string[] = [];
  let homepageContent = '';
  let homepageTitle = '';
  let homepageBase64Image = '';
  let homepageMetaData: Record<string, string> = {};
  while (queue.length > 0) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url) || depth > maxDepth) continue;
    visited.add(url);
    urls.push(url);
    let htmlContent = '';
    let title = '';
    try {

      await prisma.taskExecution.update({
        where: { id: taskExecutionId },
        data: { stage: `获取${url}的元数据` },
      });

      const metaData = await crawlMetaData(url);
      const { image_base64, ...meta } = metaData;

      await prisma.taskExecution.update({
        where: { id: taskExecutionId },
        data: { stage: `扫描${url}的内容` },
      });


      const response = await crawlPage(url);
      const content = response.text;
      htmlContent = response.htmlContent
      title = response.title;

      if (homepageContent === '' && depth === 0) {
        homepageContent = content;
        homepageTitle = title;
        homepageBase64Image = metaData.image_base64 || '';
        homepageMetaData = meta || {};
      }

      // 处理新域名和关联
      await handleNewDomainAndAssociation(taskExecutionId, assetId, startUrl, url);

      // 清理内容中的 null 字节
      const cleanHtmlContent = htmlContent.replace(/\x00/g, '');

      const { vulnerabilities } = response;
      // 保存页面内容到数据库
      await prisma.webpage.upsert({
        where: { assetId_url: { assetId, url } },
        update: { 
          htmlContent: cleanHtmlContent, 
          content: content, 
          title, 
          isHomepage: depth === 0, 
          vulnerabilities,
          metadata: meta || null, // 保存元数据
          imageBase64: image_base64 || null, 
        },
        create: { 
          assetId, 
          url, 
          htmlContent: cleanHtmlContent, 
          content: content, 
          title, 
          isHomepage: depth === 0, 
          vulnerabilities,
          metadata: meta || null, // 保存元数据
          imageBase64: image_base64 || null, // 如果有图片则保存
        },
      });
      
      const links = response.links || [];

      queue.push(
        ...links.map(link => {
          return { url: link, depth: depth + 1 };
        }
        ).filter(Boolean) as { url: string; depth: number }[]
      );

      
    } catch (e) {
      console.error(`Error crawling ${url}:`, e);
      continue;
    }
  }
  // 生成 sitemap.xml
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>';
  await prisma.asset.update({ where: { id: assetId }, data: { sitemapXml } });
  return { urls, sitemapXml, homepageTitle, homepageContent, homepageBase64Image, homepageMetaData };
};


export async function createTaskExecution(values: FormValues) {
   // 无论是定时任务还是一次性任务，都需要先创建任务
   let scheduledTaskId = null;
   if (values.isScheduled && values.scheduleType) {
     console.log('Creating scheduled task...');
   }

   const task = await createScheduledTask({
     taskName: values.taskName || `Scan_${new Date().toISOString()}`,
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

   return { taskExecutionId, scheduledTaskId, taskName };
}


export async function scanAndAnalyzeAction(
  values: FormValues
): Promise<{ taskExecutionId: string | null; error: string | null }> {
  const validation = formSchema.safeParse(values);
  if (!validation.success) {
    const error = validation.error.errors[0];
    return { taskExecutionId: null, error: `${error.path.join('.')}: ${error.message}` };
  }

  try {
    const { taskExecutionId, scheduledTaskId, taskName } = await createTaskExecution(values);

    let analysisTargets: {type: 'ip' | 'url', value: string}[] = [];

    if (values.url) {
      analysisTargets.push({ type: 'url', value: values.url });
    } else if (values.ipRange) {
      const activeIPs = getActiveIPsFromRange(values.ipRange);
      analysisTargets = activeIPs.map(ip => ({ type: 'ip', value: ip }));
    }


    // 2. 启动异步扫描分析
    (async () => {
      try {
        const analysisPromises = analysisTargets.map(async (target) => {
          let content: string;
          let ip: string;
          let displayUrl: string;
          let htmlContent = '';
          let crawledUrls: string[] = [];
          let sitemapXml = '';
    
          if (target.type === 'url') {
            displayUrl = target.value;
            const domain = new URL(displayUrl).hostname;
            const resolvedIp = await getIpFromDomain(domain);
            if (!resolvedIp) {
              throw new Error(`Could not resolve IP for initial target domain: ${domain}`);
            }
            ip = resolvedIp;
          } else { // ip
            ip = target.value;
            displayUrl = `http://${ip}`;
          }
    
          // 递归爬取整个网站
          let assetId: string | null = null;
          let homepageContent = '';
          let homepageTitle = '';
          
    
          // 先 upsert asset，获得 assetId
          const assetData = {
            ip: ip,
            domain: target.type === 'url' ? new URL(target.value).hostname : '',
            status: 'Active',
            openPorts: '',
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
    
          // 1. 爬取前，更新 stage
          if (taskExecutionId) {
            await prisma.taskExecution.update({
              where: { id: taskExecutionId },
              data: { stage: `正在扫描${displayUrl}` },
            });
          }
    
          // 爬取全站并生成 sitemap
          let crawlDepth: number;
          if (values.crawlDepth === 'full') {
            crawlDepth = 99;
          } else if (values.crawlDepth === 'level1') {
            crawlDepth = 0; // level1 means only the homepage
          }else if (values.crawlDepth === 'level2') {
            crawlDepth = 1; // level2 means homepage + one level deep
          } else if (values.crawlDepth === 'level3') {
            crawlDepth = parseInt((values.customCrawlDepth ?? '2').toString(), 10); // custom depth
          } else {
            crawlDepth = 3; // fallback
          }
          const crawlResult = await crawlWebsite(displayUrl, assetId, crawlDepth, taskExecutionId);
          crawledUrls = crawlResult.urls;
          sitemapXml = crawlResult.sitemapXml;
          homepageContent = crawlResult.homepageContent;
          homepageTitle = crawlResult.homepageTitle;
          const homepageBase64Image = crawlResult.homepageBase64Image;
          const homepageMetaData = crawlResult.homepageMetaData;

          console.log(`homepageTitle: ${homepageTitle}, homepageContent: ${homepageContent}`);

    
          // 2. 爬取后AI分析前，更新 stage
          if (taskExecutionId) {
            await prisma.taskExecution.update({
              where: { id: taskExecutionId },
              data: { stage: '正在AI分析网站内容' },
            });
          }
    
          // 分析首页内容
          content = homepageTitle + homepageContent
            ? homepageContent.replace(/<style[^>]*>.*?<\/style>/g, ' ')
                             .replace(/<script[^>]*>.*?<\/script>/g, ' ')
                             .replace(/<[^>]*>/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim()
            : '';
    
          const [analysisResult, businessValueResult, associationResult] = await Promise.all([
            analyzeWebsiteContent({ url: displayUrl, content: content }),
            determineBusinessValue({ url: displayUrl, content: content, valueKeywords: values.valueKeywords }),
            ipAssociationAnalysis({ ip: ip || displayUrl }),
          ]);
    
          // 3. 分析结束后，更新 stage
          if (taskExecutionId) {
            await prisma.taskExecution.update({
              where: { id: taskExecutionId },
              data: { stage: '分析结束' },
            });
          }
    
          console.log(`Analysis for ${displayUrl} completed:`, {
            analysisResult,
            businessValueResult,
            associationResult,
          });
    
          const geolocation = await getGeolocationFromUrl(displayUrl);

          const portList = [21, 22, 80, 443, 3306, 8080, 5432, 6379];
          const hostname = new URL(displayUrl).hostname;
          const openPorts = await scanOpenPorts(hostname, portList);
          const openPortsStr = openPorts.join(', ');

          // 更新 asset 的分析信息
          await prisma.asset.update({
            where: { id: assetId },
            data: {
              valuePropositionScore: businessValueResult.valuePropositionScore,
              summary: analysisResult,
              geolocation,
              openPorts: openPortsStr,
              services: businessValueResult.analysis,
              networkTopology: associationResult,
              imageBase64: homepageBase64Image || null,
              metadata: homepageMetaData || null, // 保存首页元数据
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
          if (scheduledTaskId && values.isScheduled && values.scheduleType) {
            await updateNextRunTime(scheduledTaskId, values.scheduleType!);
          }
        }
      } catch (e) {
        await prisma.taskExecution.update({
          where: { id: taskExecutionId },
          data: { status: 'failed', stage: '任务失败' }
        });
      }
    })();


    revalidatePath('/');
    revalidatePath('/tasks');
    return { taskExecutionId, error: null };
  } catch (error) {
    console.error('Error during scan and analysis:', error);
    return { taskExecutionId: null, error: 'Failed to complete analysis. Please try again.' };
  }
}
