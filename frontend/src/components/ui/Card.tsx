import type { ReactNode } from 'react';

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element => {
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
};

export default Card;
