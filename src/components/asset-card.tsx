import React from 'react';
import type { AnalyzeWebsiteContentOutput } from '@/ai/flows/analyze-website-content';
import type { DetermineBusinessValueOutput } from '@/ai/flows/determine-business-value';
import type { IpAssociationAnalysisOutput } from '@/ai/flows/ip-association-analysis';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Briefcase, FileText, Globe, MapPin, Network, Server } from 'lucide-react';

export type Asset = {
  ip: string;
  analysis: AnalyzeWebsiteContentOutput;
  businessValue: DetermineBusinessValueOutput;
  association: IpAssociationAnalysisOutput;
};

type AssetCardProps = {
  asset: Asset;
};

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Card className="flex flex-col h-full hover:border-primary/80 transition-colors duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-code text-xl">{asset.ip}</CardTitle>
          <Badge variant="outline" className="border-green-500/50 text-green-400">
            Active
          </Badge>
        </div>
        <CardDescription>
          <div className="flex items-center gap-2 text-xs">
            <Globe className="w-3 h-3" /> {asset.association?.domain}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow grid gap-4">
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Business Value</h4>
          <p className="text-xs text-muted-foreground mb-2">
            {asset?.businessValue?.businessValueSummary}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Value Proposition Score</span>
              <span className="font-semibold">{asset?.businessValue?.valuePropositionScore}%</span>
            </div>
            <Progress value={asset?.businessValue?.valuePropositionScore} className="h-2" />
          </div>
        </div>

        <Separator />
        
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Content Analysis</h4>
          <p className="text-xs text-muted-foreground">
            {asset?.analysis?.summary}
          </p>
        </div>

        <Separator />

        <div>
           <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Network className="w-4 h-4 text-primary" /> IP Association</h4>
           <div className="space-y-2 text-xs">
             <div className="flex items-start gap-2">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{asset.association?.geolocation}</span>
             </div>
             <div className="flex items-start gap-2">
                <Server className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{asset.association?.services}</span>
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
