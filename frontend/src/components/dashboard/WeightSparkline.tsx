import Card from '../ui/Card';

const WeightSparkline = (): JSX.Element => {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600">Weight Trend</h3>
      <div className="mt-4 h-24 rounded-md border border-dashed border-slate-300" />
    </Card>
  );
};

export default WeightSparkline;
