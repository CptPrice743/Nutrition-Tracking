type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
};

const Toggle = ({ checked, onChange, label }: ToggleProps): JSX.Element => {
  return (
    <label className="inline-flex items-center gap-2">
      <button
        type="button"
        className={`h-6 w-11 rounded-full transition ${checked ? 'bg-accent-600' : 'bg-slate-300'}`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
      {label ? <span className="text-sm text-slate-700">{label}</span> : null}
    </label>
  );
};

export default Toggle;
