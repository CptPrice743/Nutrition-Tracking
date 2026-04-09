import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label: string;
  options: SelectOption[];
  error?: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, id, style, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor={selectId} className="field-label" style={{ margin: 0 }}>
          {label}
        </label>
        <div style={{ position: 'relative' }}>
          <select
            ref={ref}
            id={selectId}
            className="input"
            style={{
              borderColor: error ? 'var(--danger)' : undefined,
              paddingRight: 36,
              appearance: 'none',
              cursor: 'pointer',
              ...style
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              pointerEvents: 'none'
            }}
          >
            ▾
          </span>
        </div>
        {error ? (
          <p id={errorId} style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
