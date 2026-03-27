import { useState, type FormEvent } from 'react';

import Button from '../ui/Button';
import Input from '../ui/Input';

type DailyLogFormProps = {
  onSubmit: (payload: { date: string; caloriesConsumed?: number }) => Promise<void> | void;
  initialDate?: string;
};

const DailyLogForm = ({ onSubmit, initialDate }: DailyLogFormProps): JSX.Element => {
  const [date, setDate] = useState(initialDate ?? '');
  const [calories, setCalories] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      date,
      caloriesConsumed: calories ? Number(calories) : undefined
    });
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      <Input
        type="number"
        min={0}
        placeholder="Calories consumed"
        value={calories}
        onChange={(event) => setCalories(event.target.value)}
      />
      <Button type="submit">Save Daily Log</Button>
    </form>
  );
};

export default DailyLogForm;
