import { getScanHistory } from '@/lib/actions';
import { HistoryTable } from './_components/history-table';
import { columns, type ScanHistory } from './_components/columns';

export default async function ScanHistoryPage() {
  const history: ScanHistory[] = await getScanHistory();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">扫描历史</h1>
      <HistoryTable columns={columns} data={history} />
    </div>
  );
}
