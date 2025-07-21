'use client';

import React from 'react';
import { HistoryTable } from './history-table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle, Table as TableIcon, LayoutGrid } from 'lucide-react';
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
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
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
          {/* <div className="text-sm">状态：<StatusIcon status={item.status} /></div> */}
        </div>
      ))}
    </div>
  );
}

export default function HistoryViewSwitcher({ history, columns }: { history: ScanHistory[], columns: ColumnDef<ScanHistory, any>[] }) {
  const [view, setView] = React.useState<'table' | 'card'>('table');

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