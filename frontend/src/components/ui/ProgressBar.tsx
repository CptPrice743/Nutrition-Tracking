const ProgressBar = ({ value }: { value: number }): JSX.Element => {
  const safeValue = Math.min(Math.max(value, 0), 100);
  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div className="h-2 rounded-full bg-accent-600" style={{ width: `${safeValue}%` }} />
    </div>
  );
};

export default ProgressBar;
