'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Server, 
  Clock, 
  Play, 
  Pause, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  Calendar,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface AssetStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  byPriority: { [key: string]: number };
}

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  scheduleType: string;
  executions: TaskExecution[];
}

interface TaskExecution {
  id: string;
  status: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  assetsFound: number;
}

export default function Dashboard() {
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [activeTasks, setActiveTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, tasksResponse] = await Promise.all([
        fetch('/api/assets/stats'),
        fetch('/api/tasks')
      ]);

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setAssetStats(stats);
      }

      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        // 只显示活跃的任务
        setActiveTasks(tasks.filter((task: ScheduledTask) => task.isActive));
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch dashboard data',
      });
    } finally {
      setLoading(false);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">NetSight Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          网络资产管理和监控中心
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总资产数</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              网络中发现的所有资产
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃资产</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              当前在线和可访问的资产
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃任务</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              正在运行的定时扫描任务
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高优先级</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(assetStats?.byPriority?.High || 0) + (assetStats?.byPriority?.Critical || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              高优先级和关键资产
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 资产状态分布 */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              资产状态分布
            </CardTitle>
            <CardDescription>
              按状态分类的资产数量
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">活跃</span>
                </div>
                <Badge variant="outline">{assetStats?.active || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">维护中</span>
                </div>
                <Badge variant="outline">{assetStats?.maintenance || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">离线</span>
                </div>
                <Badge variant="outline">{assetStats?.inactive || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              活跃任务
            </CardTitle>
            <CardDescription>
              当前正在运行的定时任务
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">暂无活跃任务</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatScheduleType(task.scheduleType)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.executions.length > 0 && task.executions[0].status === 'running' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : (
                        <Play className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
                {activeTasks.length > 3 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      还有 {activeTasks.length - 3} 个任务...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/scanner">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                开始扫描
              </CardTitle>
              <CardDescription>
                立即执行网络扫描任务
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                任务管理
              </CardTitle>
              <CardDescription>
                管理定时扫描任务
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/assets">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                资产管理
              </CardTitle>
              <CardDescription>
                查看和管理网络资产
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
