'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AssetCard, type Asset } from '@/components/asset-card';
import { scanAndAnalyzeAction } from '@/lib/actions';
import { Loader2, ScanLine, Telescope, Calendar, X } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

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
  proxy: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ScannerPage() {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Asset[]>([]);
  const [taskExecutionId, setTaskExecutionId] = useState<string | null>(null);
  const [stage, setStage] = useState<string>('任务已创建');
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskName: '',
      description: '',
      ipRange: '',
      url: '',
      scanRate: 'adaptive',
      isScheduled: false,
      scheduleType: 'once',
      crawlDepth: 'level1',
      extractImages: true,
      valueKeywords: ['政府', '国家', '金融监管'],
      customCrawlDepth: 2,
      proxy: 'http://127.0.0.1:7890',
    },
  });

  const { register, watch } = form;

  const [keywords, setKeywords] = useState<string[]>(form.getValues('valueKeywords') || []);
  const [keywordInput, setKeywordInput] = useState('');

  const handleAddKeyword = () => {
    if (keywordInput && !keywords.includes(keywordInput)) {
      const newKeywords = [...keywords, keywordInput];
      setKeywords(newKeywords);
      form.setValue('valueKeywords', newKeywords);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const newKeywords = keywords.filter(k => k !== keywordToRemove);
    setKeywords(newKeywords);
    form.setValue('valueKeywords', newKeywords);
  };

  const isScheduled = form.watch('isScheduled');

  // 轮询任务进度
  React.useEffect(() => {
    if (!taskExecutionId) return;

    let polling = true;
    const poll = async () => {
      const res = await fetch(`/api/task-execution/${taskExecutionId}`);
      if (res.ok) {
        const data = await res.json();
        setStage(data.stage || '任务已创建');
        if (data.status === 'completed') {
          setResults(data.assets || []);
          polling = false;
          setTaskExecutionId(null);
        }
        if (data.status === 'failed') {
          polling = false;
          setTaskExecutionId(null);
        }
      }
    };
    poll();
    const interval = setInterval(() => { if (polling) poll(); }, 2000);
    return () => clearInterval(interval);
  }, [taskExecutionId]);

  const onSubmit = (values: FormValues) => {
    setResults([]);
    setTaskExecutionId(null);
    setStage('任务已创建');
    startTransition(async () => {
      const response = await scanAndAnalyzeAction(values);
      if (response.error) {
        toast({
          variant: 'destructive',
          title: '发生错误',
          description: response.error,
        });
      } else if (response.taskExecutionId) {
        setTaskExecutionId(response.taskExecutionId);
        toast({
          title: '任务已创建',
          description: '扫描任务已开始，请等待结果...',
        });
      }
    });
  };

  return (
    <>
      <section className="mb-12">
        <Card className="max-w-5xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>网络扫描与分析</CardTitle>
                <CardDescription>
                  输入IP范围或URL来扫描活跃资产并进行分析。
                </CardDescription>
              </div>
              <Link href="/tasks">
                <Button variant="outline" size="sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  任务管理
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-4 ">

                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="例如：https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.proxy}
                  name="proxy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>代理 (可选)</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：192.168.0.1:8080" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taskName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>任务名称（可选）</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：办公室网络扫描" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>任务描述</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="描述此扫描任务的目的和范围..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={form.control}
                  name="crawlDepth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>爬取深度</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择爬取深度" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="level1">仅目标页面</SelectItem>
                          <SelectItem value="level2">目标页面及其链接</SelectItem>
                          <SelectItem value="level3">自定义爬取深度</SelectItem>
                          <SelectItem value="full">全站</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {watch('crawlDepth') === 'level3' && (
                  <FormItem>
                    <FormLabel>自定义爬取深度</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        defaultValue={2}
                        {...register('customCrawlDepth', { valueAsNumber: true, min: 2 })}
                        className="input input-bordered w-full"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>最小为2，表示爬取目标页面及其直接和间接链接。</FormDescription>
                  </FormItem>
                )}

                <FormField
                  control={form.control}
                  name="extractImages"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">提取图片</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          在爬取时提取并分析图片资源
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valueKeywords"
                  render={() => (
                    <FormItem>
                      <FormLabel>价值评估关键词</FormLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          placeholder="添加自定义关键词"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddKeyword();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleAddKeyword} disabled={!keywordInput.trim()}>
                          添加
                        </Button>
                      </div>
                      <FormMessage />
                      <div className="flex flex-wrap gap-2 mt-2 min-h-[2.5rem] p-2 border rounded-md">
                        {keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                            {keyword}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(keyword)}
                              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scanRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>扫描速率</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择扫描速率" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="slow">慢速</SelectItem>
                          <SelectItem value="normal">正常</SelectItem>
                          <SelectItem value="fast">快速</SelectItem>
                          <SelectItem value="adaptive">自适应</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isScheduled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">定时任务</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          将此扫描设置为定时任务
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isScheduled && (
                  <FormField
                    control={form.control}
                    name="scheduleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>执行周期</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择执行周期" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="once">一次性任务</SelectItem>
                            <SelectItem value="daily">每天</SelectItem>
                            <SelectItem value="weekly">每周</SelectItem>
                            <SelectItem value="every3days">每三天</SelectItem>
                            <SelectItem value="monthly">每月</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full col-span-2" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="mr-2 h-4 w-4" />
                  )}
                  {isPending ? '扫描中...' : (isScheduled ? '创建定时任务' : '开始扫描')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>

      <section>
        {isPending || taskExecutionId ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-semibold">扫描网络中</h2>
            <p className="text-muted-foreground">
              正在识别活跃IP并分析资产。这可能需要一些时间...
            </p>
            <p className="text-muted-foreground">
              {stage}
            </p>
          </div>
        ) : results.length > 0 ? (
          <div>
            <h2 className="text-3xl font-bold mb-6">扫描结果</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
        ) : (
           <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
              <Telescope className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">准备发现</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                您的扫描结果将在此处显示，一旦您开始扫描。
              </p>
          </div>
        )}
      </section>
    </>
  );
}

