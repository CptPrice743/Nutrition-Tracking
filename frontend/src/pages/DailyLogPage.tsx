import { useParams } from 'react-router-dom';

import DailyLogForm from '../components/forms/DailyLogForm';
import { useCreateLog } from '../hooks/useLogs';

const DailyLogPage = (): JSX.Element => {
  const { date } = useParams();
  const createLog = useCreateLog();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Daily Log</h1>
      <DailyLogForm
        initialDate={date}
        onSubmit={async (payload) => {
          await createLog.mutateAsync(payload);
        }}
      />
    </section>
  );
};

export default DailyLogPage;
