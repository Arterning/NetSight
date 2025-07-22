'use client';

import React from 'react';
import { HistoryTable } from './history-table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle, Table as TableIcon, LayoutGrid, ChevronLeft, ChevronRight, Server } from 'lucide-react';
import Link from 'next/link';
import type { ScanHistory } from './columns';
import type { ColumnDef } from '@tanstack/react-table';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
  }
}

function CardView({ data }: { data: ScanHistory[] }) {
  // 分页
  const PAGE_SIZE = 6;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pagedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pagedData.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon status={item.status} />
              <Link href={`/task-execution/${item.id}`} className="text-lg font-semibold text-blue-600 hover:underline truncate">
                {item.scheduledTask?.name || '-'}
              </Link>
              <span className="ml-auto text-xs text-muted-foreground">{item.scheduledTask?.scheduleType === 'once' ? '手动扫描' : '定时任务'}</span>
            </div>
            <div className="text-sm text-muted-foreground">开始时间：{item.startTime ? new Date(item.startTime).toLocaleString() : 'N/A'}</div>
            <div className="text-sm">持续时间：{item.duration ?? '-'} 秒</div>
            <div className="text-sm">发现资产数：{item.assetsFound}</div>
            {/* 资产列表 */}
            {item.assets && item.assets.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold text-sm mb-1">发现资产：</div>
                <div className="max-h-32 overflow-y-auto border rounded p-2 flex flex-col gap-1">
                  {item.assets.map(asset => (
                    <Link
                      key={asset.id}
                      href={`/assets/${asset.id}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline text-xs truncate"
                      title={`IP: ${asset.ip}${asset.domain ? ' | 域名: ' + asset.domain : ''}`}
                    >
                      <Server className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate" title={asset.domain || asset.ip}>
                        {asset.domain ? `${asset.domain} (${asset.ip})` : asset.ip}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* 分页控件始终显示 */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="上一页"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span>第 {page} / {totalPages} 页</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
          disabled={page >= totalPages}
          aria-label="下一页"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </>
  );
}

export default function HistoryViewSwitcher({ history, columns }: { history: ScanHistory[], columns: ColumnDef<ScanHistory, any>[] }) {
  const [view, setView] = React.useState<'table' | 'card'>('card');

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">扫描历史</h1>
        <div className="flex gap-2">
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('table')}
            aria-label="表格视图"
          >
            <TableIcon className="w-5 h-5" />
          </Button>
          <Button
            variant={view === 'card' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('card')}
            aria-label="卡片视图"
          >
            <LayoutGrid className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {view === 'table' ? (
        <HistoryTable columns={columns} data={history} />
      ) : (
        <CardView data={history} />
      )}
    </>
  );
} 