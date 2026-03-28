import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

type BadgeProps = {
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
  children: ReactNode;
};

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  success: 'bg-green-50 text-success',
  warning: 'bg-amber-50 text-warning',
  danger: 'bg-red-50 text-danger',
  neutral: 'bg-slate-100 text-slate-700'
};

const Badge = ({ variant = 'neutral', children }: BadgeProps): JSX.Element => {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', variantClasses[variant])}>
      {children}
    </span>
  );
};

export default Badge;
