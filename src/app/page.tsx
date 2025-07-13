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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AssetCard, type Asset } from '@/components/asset-card';
import { scanAndAnalyzeAction } from '@/lib/actions';
import { Loader2, ScanLine, Telescope } from 'lucide-react';

const formSchema = z.object({
  ipRange: z.string().min(1, 'IP range is required.'),
  scanRate: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Asset[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ipRange: '192.168.1.1-255',
      scanRate: 'adaptive',
    },
  });

  const onSubmit = (values: FormValues) => {
    setResults([]);
    startTransition(async () => {
      const response = await scanAndAnalyzeAction(values);
      if (response.error) {
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: response.error,
        });
      } else {
        setResults(response.data || []);
      }
    });
  };

  return (
    <>
      <section className="mb-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Network Scan</CardTitle>
            <CardDescription>
              Enter an IP range to scan for active assets and analyze them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="ipRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Range</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 192.168.1.1/24 or 10.0.0.1-50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scanRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scan Rate</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a scan rate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="slow">Slow</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="fast">Fast</SelectItem>
                          <SelectItem value="adaptive">Adaptive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="mr-2 h-4 w-4" />
                  )}
                  {isPending ? 'Scanning...' : 'Start Scan'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>

      <section>
        {isPending ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-semibold">Scanning Network</h2>
            <p className="text-muted-foreground">
              Identifying active IPs and analyzing assets. This may take a moment...
            </p>
          </div>
        ) : results.length > 0 ? (
          <div>
            <h2 className="text-3xl font-bold mb-6">Scan Results</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((asset) => (
                <AssetCard key={asset.ip} asset={asset} />
              ))}
            </div>
          </div>
        ) : (
           <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
              <Telescope className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Ready to Discover</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your scan results will appear here once you start a scan.
              </p>
          </div>
        )}
      </section>
    </>
  );
}
