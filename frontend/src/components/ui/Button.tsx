import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import Spinner from './Spinner';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size, loading = false, disabled = false, className, style, children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    const btnClass = variant === 'danger' ? 'btn-danger'
      : variant === 'secondary' || variant === 'ghost' ? 'btn-secondary'
      : 'btn-primary';

    return (
      <button
        ref={ref}
        className={`${btnClass} ${className ?? ''}`}
        style={{
          fontSize: size === 'sm' ? '0.75rem' : size === 'lg' ? '0.9375rem' : undefined,
          opacity: isDisabled ? 0.5 : undefined,
          cursor: isDisabled ? 'not-allowed' : undefined,
          ...style
        }}
        disabled={isDisabled}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : null}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
