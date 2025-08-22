import { getAssetWithWebpages } from '@/lib/asset-actions';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, FileText, Server, MapPin, Briefcase, Network, CodeXml } from 'lucide-react';
import { WebpageViewer } from './_components/webpage-viewer';
import { SitemapDownloader } from './_components/sitemap-downloader';
import ReactMarkdown from 'react-markdown';

type AssetDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const asset = await getAssetWithWebpages(params.id);

  if (!asset) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl font-bold flex items-center gap-3">
                    <Globe className="w-8 h-8 text-primary" />
                    {asset.domain || 'N/A'}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    IP Address: {asset.ip}
                  </CardDescription>
                </div>
                <Badge variant={asset.status === 'Active' ? 'secondary' : 'outline'}>
                  {asset.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {asset.imageBase64 && (
                <>
                  <section>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5" /> Homepage Screenshot
                    </h3>
                    <div className="mt-4">
                      <img
                        src={asset.imageBase64}
                        alt={`${asset.domain} screenshot`}
                        className="rounded-lg border object-contain max-w-xl mx-auto"
                      />
                    </div>
                  </section>
                  <Separator />
                </>
              )}
              {asset.metadata && (() => {
                try {
                  // const metadata = JSON.parse(asset.metadata as string);
                  return (
                    <>
                      <section>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5" /> Metadata
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                          {Object.entries(asset.metadata).map(([key, value]) => (
                            <div key={key} className="flex">
                              <strong className="w-24 capitalize flex-shrink-0">{key.replace(/_/g, ' ')}:</strong>
                              <span className="truncate" title={String(value)}>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                      <Separator />
                    </>
                  );
                } catch (e) {
                  return null; /* Don't render if JSON is invalid */
                }
              })()}
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><FileText className="w-5 h-5" /> Summary</h3>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {asset.summary || 'No summary available.'}
                  </ReactMarkdown>
                </div>
              </section>
              <Separator />
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><Briefcase className="w-5 h-5" /> Business Value</h3>
                <p className="text-lg">价值评分: <strong>{asset.valuePropositionScore}</strong></p>
                  <ReactMarkdown>
                      {asset.services || 'No services information available.'}
                  </ReactMarkdown>
              </section>

              {/* networkTopology  */}
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><Network className="w-5 h-5" /> Network Topology</h3>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {asset.networkTopology || 'No network topology information available.'}
                  </ReactMarkdown>
                </div>
              </section>

              <Separator />
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><Network className="w-5 h-5" /> Network Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> <strong>Geolocation:</strong> {asset.geolocation}</p>
                    <p className="flex items-center gap-2"><Server className="w-4 h-4 text-muted-foreground" /> <strong>Open Ports:</strong> {asset.openPorts}</p>
                </div>
              </section>

              <Separator />
              <section>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><CodeXml className="w-5 h-5" /> Tech Report</h3>
                  <ReactMarkdown>
                      {asset.techReport}
                  </ReactMarkdown>
              </section>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Webpages ({asset.webpages.length})</CardTitle>
                  <CardDescription>Crawled pages from this asset.</CardDescription>
                </div>
                <SitemapDownloader sitemapXml={asset.sitemapXml} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto pr-4">
                <ul className="space-y-3">
                  {asset.webpages.map((page) => (
                    <li key={page.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate" title={page.title || page.url}>{page.title || 'Untitled Page'}</span>
                        {page.isHomepage && <Badge variant="secondary">Homepage</Badge>}
                      </div>
                      <WebpageViewer url={page.url} content={page.content || '' } vulnerabilities={page.vulnerabilities}/>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
