import { cn } from '../../lib/utils';

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]'
};

const Spinner = ({ size = 'md', className }: SpinnerProps): JSX.Element => {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-block animate-spin rounded-full border-accent-100 border-t-accent-500',
        sizeClasses[size],
        className
      )}
    >
      <span className="sr-only">Loading</span>
    </span>
  );
};

export default Spinner;
