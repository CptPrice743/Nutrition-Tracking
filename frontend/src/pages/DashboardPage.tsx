import WidgetGrid from '../components/dashboard/WidgetGrid';

const DashboardPage = (): JSX.Element => {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <WidgetGrid />
    </section>
  );
};

export default DashboardPage;
