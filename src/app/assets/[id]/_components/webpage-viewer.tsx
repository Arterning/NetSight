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
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Webpage Content</DialogTitle>
          <DialogDescription>
            Viewing content from: <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{url}</a>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full w-full rounded-md border p-4">
          <iframe
            srcDoc={content}
            className="w-full h-full"
            sandbox="allow-same-origin" // For security, restrict iframe capabilities
            title="Webpage Content"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
