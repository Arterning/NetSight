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
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Webpage Content</DialogTitle>
          <DialogDescription>
            Viewing content from: <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{url}</a>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow mt-4">
          <Tabs defaultValue="original" className='h-full w-full flex flex-col'>
            <TabsList>
              <TabsTrigger value="original">Original</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
            <TabsContent value="original" className='flex-grow'>
              <iframe
                src={url}
                className="w-full h-full border-0"
                sandbox="allow-same-origin" // For security, restrict iframe capabilities
                title="Webpage Original"
              />
            </TabsContent>
            <TabsContent value="content" className='flex-grow'>
              <ScrollArea className="h-full w-full rounded-md border p-4">
                <div className="whitespace-pre-wrap break-words">
                  {content}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
