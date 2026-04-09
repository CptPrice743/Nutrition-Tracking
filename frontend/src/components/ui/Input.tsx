import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  unit?: string;
  labelAction?: ReactNode;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, unit, labelAction, id, style, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label htmlFor={inputId} className="field-label" style={{ margin: 0 }}>
            {label}
          </label>
          {labelAction ? <div>{labelAction}</div> : null}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            ref={ref}
            id={inputId}
            className="input"
            style={{
              borderColor: error ? 'var(--danger)' : undefined,
              paddingRight: unit ? 44 : undefined,
              ...style
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            {...props}
          />
          {unit ? (
            <span
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 12,
                display: 'flex',
                alignItems: 'center',
                fontSize: 13,
                color: 'var(--text-tertiary)',
                pointerEvents: 'none'
              }}
            >
              {unit}
            </span>
          ) : null}
        </div>
        {error ? (
          <p id={errorId} style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
