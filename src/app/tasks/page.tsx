'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Trash2, 
  Clock, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  ipRange: string;
  scanRate: string;
  scheduleType: string;
  isActive: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  createdAt: string;
  executions: TaskExecution[];
}

interface TaskExecution {
  id: string;
  status: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  errorMessage?: string;
  assetsFound: number;
  createdAt: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch tasks',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Task ${isActive ? 'paused' : 'resumed'} successfully`,
        });
        fetchTasks();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task status',
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Task deleted successfully',
        });
        fetchTasks();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete task',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      waiting: 'secondary',
      running: 'default',
      completed: 'outline',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatScheduleType = (type: string) => {
    const types: Record<string, string> = {
      once: '一次性',
      daily: '每天',
      weekly: '每周',
      every3days: '每三天',
      monthly: '每月',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">定时任务管理</h1>
          <p className="text-muted-foreground mt-2">
            查看和管理您的网络扫描定时任务
          </p>
        </div>
        <Link href="/">
          <Button>创建新任务</Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无定时任务</h3>
            <p className="text-muted-foreground text-center mb-4">
              您还没有创建任何定时任务。点击下方按钮开始创建您的第一个任务。
            </p>
            <Link href="/">
              <Button>创建第一个任务</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {task.name}
                      <Badge variant={task.isActive ? 'default' : 'secondary'}>
                        {task.isActive ? '活跃' : '暂停'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {task.description || '无描述'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTaskStatus(task.id, task.isActive)}
                    >
                      {task.isActive ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          暂停
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          恢复
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IP范围</p>
                    <p className="text-sm">{task.ipRange}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">扫描速率</p>
                    <p className="text-sm">{task.scanRate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">执行周期</p>
                    <p className="text-sm">{formatScheduleType(task.scheduleType)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">下次执行</p>
                    <p className="text-sm">
                      {task.nextRunAt 
                        ? new Date(task.nextRunAt).toLocaleString('zh-CN')
                        : '未设置'
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">最近执行记录</h4>
                  {task.executions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无执行记录</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>状态</TableHead>
                          <TableHead>开始时间</TableHead>
                          <TableHead>执行时长</TableHead>
                          <TableHead>发现资产</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {task.executions.slice(0, 5).map((execution) => (
                          <TableRow key={execution.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(execution.status)}
                                {getStatusBadge(execution.status)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {execution.startTime 
                                ? new Date(execution.startTime).toLocaleString('zh-CN')
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {execution.duration 
                                ? `${execution.duration}秒`
                                : '-'
                              }
                            </TableCell>
                            <TableCell>{execution.assetsFound}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 