import type { InputHTMLAttributes } from 'react';

const Input = ({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>): JSX.Element => {
  return (
    <input
      className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent-500 ${className}`}
      {...props}
    />
  );
};

export default Input;
