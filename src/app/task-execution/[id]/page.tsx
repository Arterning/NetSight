import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default async function TaskExecutionDetailPage({ params }: { params: { id: string } }) {
  const execution = await prisma.taskExecution.findUnique({
    where: { id: params.id },
    include: {
      scheduledTask: true,
      assets: true,
    },
  });
  if (!execution) return notFound();

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>扫描执行详情</CardTitle>
          <CardDescription>执行ID: {execution.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2">任务名称: {execution.scheduledTask?.name || '-'}</div>
          <div className="mb-2">描述: {execution.scheduledTask?.description || '-'}</div>
          <div className="mb-2">域名: {execution.scheduledTask?.domain || '-'}</div>
          <div className="mb-2">IP范围: {execution.scheduledTask?.ipRange || '-'}</div>
          <div className="mb-2">扫描速率: {execution.scheduledTask?.scanRate || '-'}</div>
          <div className="mb-2">执行周期: {execution.scheduledTask?.scheduleType || '-'}</div>
          <div className="mb-2">开始时间: {execution.startTime ? execution.startTime.toLocaleString() : '-'}</div>
          <div className="mb-2">结束时间: {execution.endTime ? execution.endTime.toLocaleString() : '-'}</div>
          <div className="mb-2">耗时(秒): {execution.duration ?? '-'}</div>
          <div className="mb-2">状态: {execution.status}</div>
          <div className="mb-2">发现资产数: {execution.assetsFound}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>发现的资产</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>域名</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {execution.assets && execution.assets.length > 0 ? (
                execution.assets.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.ip}</TableCell>
                    <TableCell>{asset.domain || '-'}</TableCell>
                    <TableCell>{asset.status}</TableCell>
                    <TableCell>{asset.priority}</TableCell>
                    <TableCell>
                      <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:underline">查看</Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">无资产</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 