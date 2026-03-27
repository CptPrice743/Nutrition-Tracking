import type { SelectHTMLAttributes } from 'react';

const Select = ({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element => {
  return (
    <select
      className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export default Select;
