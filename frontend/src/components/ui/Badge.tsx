import type { ReactNode } from 'react';

const Badge = ({ children }: { children: ReactNode }): JSX.Element => {
  return <span className="rounded-full bg-accent-100 px-2 py-1 text-xs font-medium text-accent-700">{children}</span>;
};

export default Badge;
