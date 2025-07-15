import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scanAndAnalyzeAction } from '@/lib/actions';

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    // 查找定时任务的最新参数
    const scheduledTask = await prisma.scheduledTask.findUnique({ where: { id } });
    if (!scheduledTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    // 组装 scanAndAnalyzeAction 参数
    const values = {
      taskName: scheduledTask.name,
      description: scheduledTask.description || '',
      ipRange: scheduledTask.ipRange || undefined,
      url: undefined,
      crawlDepth: '3',
      extractImages: true,
      valueKeywords: ['政府', '国家', '金融监管'],
      scanRate: scheduledTask.scanRate,
      isScheduled: false,
      scheduleType: scheduledTask.scheduleType,
    };
    // 如果 ipRange 为空且 name 是 URL，则用 url
    if ((!scheduledTask.ipRange || scheduledTask.ipRange === '') && scheduledTask.name && scheduledTask.name.startsWith('http')) {
      values.url = String(scheduledTask.name);
      values.ipRange = undefined;
    }
    // 运行扫描分析
    const result = await scanAndAnalyzeAction(values);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Failed to rerun task:', error);
    return NextResponse.json({ error: 'Failed to rerun task' }, { status: 500 });
  }
} 