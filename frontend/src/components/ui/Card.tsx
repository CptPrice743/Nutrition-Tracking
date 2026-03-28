import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

type CardProps = {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

const Card = ({ title, action, className, children }: CardProps): JSX.Element => {
  return (
    <section className={cn('rounded-2xl border border-gray-100 bg-white p-5 shadow-sm', className)}>
      {title || action ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : <span />}
          {action ? <div>{action}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </section>
  );
};

export default Card;
