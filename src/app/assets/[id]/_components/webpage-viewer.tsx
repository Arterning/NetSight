'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from '@/components/ui/scroll-area';

type WebpageViewerProps = {
  url: string;
  content: string;
};

export function WebpageViewer({ url, content }: WebpageViewerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Content</Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh]">
        <div className='flex flex-col gap-2'>
          <DialogHeader>
            <DialogTitle>Webpage Content</DialogTitle>
            <DialogDescription>
              Viewing content from: <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{url}</a>
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="original" className='h-full w-full'>
          <TabsList>
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>
          <TabsContent value="original" className='h-full w-full'>
            <iframe
              src={url}
              className="w-full h-full"
              sandbox="allow-same-origin" // For security, restrict iframe capabilities
              title="Webpage Original"
            />
          </TabsContent>
          <TabsContent value="content" className='h-full w-full'>
            <iframe
              srcDoc={content}
              className="w-full h-full"
              sandbox="allow-same-origin" // For security, restrict iframe capabilities
              title="Webpage Content"
            />
          </TabsContent>
          </Tabs>
        </div>
        {/* <ScrollArea className="h-full w-full rounded-md border p-4">
          
        </ScrollArea> */}
      </DialogContent>
    </Dialog>
  );
}
