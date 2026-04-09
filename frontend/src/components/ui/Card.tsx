import type { ReactNode } from 'react';

type CardProps = {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

const Card = ({ title, action, className, children }: CardProps): JSX.Element => {
  return (
    <section
      className={`card ${className ?? ''}`}
    >
      {title || action ? (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          {title ? (
            typeof title === 'string'
              ? <h3 className="title" style={{ margin: 0 }}>{title}</h3>
              : <div>{title}</div>
          ) : <span />}
          {action ? <div>{action}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </section>
  );
};

export default Card;
