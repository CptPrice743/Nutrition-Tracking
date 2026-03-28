import { cn } from '../../lib/utils';

const Skeleton = ({ className = '' }: { className?: string }): JSX.Element => {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/80', className)} aria-hidden="true" />;
};

export default Skeleton;
