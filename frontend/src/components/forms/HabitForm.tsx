import { useState, type FormEvent } from 'react';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

type HabitFormPayload = {
  name: string;
  habitType: 'count' | 'boolean';
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'x_per_week' | 'x_per_month' | 'x_in_y_days';
};

const HabitForm = ({ onSubmit }: { onSubmit: (payload: HabitFormPayload) => Promise<void> | void }): JSX.Element => {
  const [name, setName] = useState('');
  const [habitType, setHabitType] = useState<'count' | 'boolean'>('count');
  const [frequencyType, setFrequencyType] = useState<HabitFormPayload['frequencyType']>('daily');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ name, habitType, frequencyType });
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Habit name" required />
      <Select value={habitType} onChange={(event) => setHabitType(event.target.value as 'count' | 'boolean')}>
        <option value="count">Count</option>
        <option value="boolean">Boolean</option>
      </Select>
      <Select
        value={frequencyType}
        onChange={(event) =>
          setFrequencyType(event.target.value as HabitFormPayload['frequencyType'])
        }
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="x_per_week">X per week</option>
        <option value="x_per_month">X per month</option>
        <option value="x_in_y_days">X in Y days</option>
      </Select>
      <Button type="submit">Save Habit</Button>
    </form>
  );
};

export default HabitForm;
