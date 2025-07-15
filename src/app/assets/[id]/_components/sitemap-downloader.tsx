'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

type SitemapDownloaderProps = {
  sitemapXml: string | null;
};

export function SitemapDownloader({ sitemapXml }: SitemapDownloaderProps) {
  if (!sitemapXml) {
    return null;
  }

  const handleDownload = () => {
    const blob = new Blob([sitemapXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleDownload} size="sm" variant="outline">
      <Download className="w-4 h-4 mr-2" />
      Download Sitemap
    </Button>
  );
}
