import { getScanHistory } from '@/lib/task-actions';
import { columns, type ScanHistory } from './_components/columns';
import HistoryViewSwitcher from './_components/HistoryViewSwitcher';

export default async function ScanHistoryPage() {
  const history: ScanHistory[] = await getScanHistory();

  return (
    <div className="container mx-auto py-10">
      <HistoryViewSwitcher history={history} columns={columns} />
    </div>
  );
}
