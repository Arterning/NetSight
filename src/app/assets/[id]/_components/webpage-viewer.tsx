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
  vulnerabilities?: string;
};

export function WebpageViewer({ url, content, vulnerabilities }: WebpageViewerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Content</Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Webpage Content</DialogTitle>
          <DialogDescription>
            Viewing content from: <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline whitespace-pre-wrap break-words">{url}</a>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow mt-4">
          <Tabs defaultValue="content" className='h-full w-full flex flex-col'>
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="original">Original</TabsTrigger>
              <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
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
                <div className="h-96  whitespace-pre-wrap break-words">
                  {content}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="vulnerabilities" className='flex-grow'>
              <ScrollArea className="h-full w-full rounded-md border p-4">
                <div className="h-96 whitespace-pre-wrap break-words text-red-600">
                  {vulnerabilities ? vulnerabilities : 'No vulnerabilities detected.'}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
