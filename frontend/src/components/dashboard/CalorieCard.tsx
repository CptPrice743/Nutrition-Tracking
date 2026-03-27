import Card from '../ui/Card';

const CalorieCard = (): JSX.Element => {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600">Calories</h3>
      <p className="mt-2 text-2xl font-semibold">--</p>
    </Card>
  );
};

export default CalorieCard;
