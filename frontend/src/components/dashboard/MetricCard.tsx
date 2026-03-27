import Card from '../ui/Card';

type MetricCardProps = {
  title: string;
  value: string;
};

const MetricCard = ({ title, value }: MetricCardProps): JSX.Element => {
  return (
    <Card>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
};

export default MetricCard;
