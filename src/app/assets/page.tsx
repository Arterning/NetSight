import { getAssets } from '@/lib/actions';
import { AssetTable } from './_components/asset-table';
import { columns } from './_components/columns';

export default async function AssetManagementPage() {
  const assets = await getAssets();

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
        <p className="text-muted-foreground">
          View, filter, and manage all discovered network assets.
        </p>
      </div>
      <AssetTable columns={columns} data={assets} />
    </div>
  );
}
