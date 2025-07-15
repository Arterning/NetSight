'use client';

import { ColumnDef } from '@tanstack/react-table';
import { TaskExecution, ScheduledTask } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Extend TaskExecution to include the nested ScheduledTask object
export type ScanHistory = TaskExecution & {
  scheduledTask: ScheduledTask;
};

export const columns: ColumnDef<ScanHistory>[] = [
  {
    accessorKey: 'scheduledTask.name',
    header: '任务名称',
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      let variant: 'secondary' | 'outline' | 'destructive' = 'secondary';
      if (status === 'completed') variant = 'secondary';
      if (status === 'running') variant = 'outline';
      if (status === 'failed') variant = 'destructive';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'startTime',
    header: '开始时间',
    cell: ({ row }) => {
      const startTime = row.getValue('startTime') as string;
      return <span>{startTime ? format(new Date(startTime), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}</span>;
    },
  },
  {
    accessorKey: 'duration',
    header: '持续时间 (秒)',
  },
  {
    accessorKey: 'assetsFound',
    header: '发现资产数',
  },
  {
    accessorKey: 'scheduledTask.scheduleType',
    header: '类型',
    cell: ({ row }) => {
        const scheduleType = row.original.scheduledTask.scheduleType;
        return <Badge variant="outline">{scheduleType === 'once' ? '手动扫描' : '定时任务'}</Badge>
    }
  },
];
