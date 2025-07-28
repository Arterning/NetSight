import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, ExternalLink, Server, Activity, AlertCircle, Info } from 'lucide-react';
import type { Asset as PrismaAsset } from '@prisma/client';
import { AssetActions } from '@/app/assets/_components/asset-actions';

export type Asset = PrismaAsset;

type AssetCardProps = {
  asset: Asset;
  onAssetUpdate: () => void;
};

const getStatusInfo = (status: Asset['status']) => {
  switch (status) {
    case 'Active':
      return {
        variant: 'default',
        Icon: Activity,
        label: 'Active',
        className: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20',
      };
    case 'Inactive':
      return {
        variant: 'secondary',
        Icon: AlertCircle,
        label: 'Inactive',
        className: 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20',
      };
    case 'Maintenance':
      return {
        variant: 'outline',
        Icon: Info,
        label: 'Maintenance',
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20',
      };
    default:
      return {
        variant: 'secondary',
        Icon: Server,
        label: 'Unknown',
        className: '',
      };
  }
};

const getPriorityInfo = (priority: Asset['priority']) => {
    switch (priority) {
      case 'Low':
        return { variant: 'secondary', label: 'Low' };
      case 'Medium':
        return { variant: 'default', label: 'Medium', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'High':
        return { variant: 'outline', label: 'High', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
      case 'Critical':
        return { variant: 'destructive', label: 'Critical' };
      default:
        return { variant: 'secondary', label: 'N/A' };
    }
  };

export function AssetCard({ asset, onAssetUpdate }: AssetCardProps) {
  const statusInfo = getStatusInfo(asset.status);
  const priorityInfo = getPriorityInfo(asset.priority);

  return (
    <Card className="flex flex-col h-full w-full transition-colors duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 overflow-hidden">
            <CardTitle className="text-lg truncate" title={asset.name || asset.ip}>
              <div className="flex items-center gap-2 mt-1">
                <Globe className="w-3 h-3" />
                {asset.domain || asset.ip}
              </div>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs mt-1">
              <span className="truncate">{asset.name}</span>
            </CardDescription>
          </div>
          <AssetActions asset={asset} onAssetUpdate={onAssetUpdate} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        {asset.imageBase64 && (
          <div className="my-4">
            <img
              src={asset.imageBase64}
              alt={`${asset.domain} screenshot`}
              className="rounded-lg object-cover w-full h-40"
            />
          </div>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 h-[40px]">
          {asset.description || asset.name }
        </p>
        <div className="text-xs text-muted-foreground">
          <strong>Value Score:</strong> {asset.valuePropositionScore}%
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="pt-4 flex justify-between items-center">
        <div className="flex gap-2 items-center">
            <Badge variant={statusInfo.variant} className={statusInfo.className}>
                <statusInfo.Icon className="w-3 h-3 mr-1.5" />
                {statusInfo.label}
            </Badge>
            <Badge variant={priorityInfo.variant} className={priorityInfo.className}>
                {priorityInfo.label}
            </Badge>
        </div>
        <Link href={`/assets/${asset.id}`} passHref>
          <Button variant="ghost" size="sm">
            Details
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
